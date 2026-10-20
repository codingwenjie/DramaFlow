import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import os from 'os';
import path from 'path';

const execFileAsync = promisify(execFile);

export interface SynthesisShotInput {
  id: string;
  scene: number;
  index: number;
  imageBase64: string;
  /** AI 生成的视频片段（base64），有则合成时优先使用，无则回退分镜图 */
  videoBase64?: string;
  videoFormat?: string;
  duration: number;
  desc: string;
  type: string;
  angle: string;
  lineId?: string;
}

export interface SynthesisLineInput {
  id: string;
  scene: number;
  character: string;
  text: string;
  speed: number;
  volume: number;
  /** 配音模块生成的 AI 音频（base64）。有则直接使用，无则回退本地 say */
  audioBase64?: string;
  audioFormat?: string;
}

export interface SynthesisJobInput {
  projectId: string;
  projectName: string;
  shots: SynthesisShotInput[];
  lines: SynthesisLineInput[];
  fps: number;
  width: number;
  height: number;
  /** 视频码率（如 "8000k"），缺省时走 CRF 默认编码 */
  bitrate?: string;
  /** 背景音乐素材（base64），开启 BGM 且提供了素材时混入；无素材时不混音 */
  bgm?: {
    base64: string;
    format: string;
    /** 音量系数（0~1.5），缺省 0.3 */
    volume?: number;
  };
  /** 后期处理开关（字幕/水印在渲染进程画图时处理） */
  postProcessing?: {
    colorGrading: boolean;
    bgm: boolean;
    introOutro: boolean;
  };
}

export interface SynthesisProgress {
  stage: 'assets' | 'tts' | 'render' | 'concat' | 'done';
  percent: number;
  message: string;
  shotIndex?: number;
  shotTotal?: number;
}

export interface SynthesisResult {
  ok: boolean;
  error?: string;
  outputPath?: string;
  duration?: number;
  size?: number;
}

type ProgressFn = (p: SynthesisProgress) => void;

const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const FFPROBE = process.env.FFPROBE_PATH || 'ffprobe';
const SAY = '/usr/bin/say';

/**
 * 本地合成主流程：图片素材 → 配音生成 → 逐镜头渲染 → 拼接封装。
 * 不依赖任何云服务，可在 Electron 主进程或纯 Node 环境运行。
 */
export async function runSynthesis(
  job: SynthesisJobInput,
  onProgress: ProgressFn,
  outputDir: string
): Promise<SynthesisResult> {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dramaflow-synth-'));
  const { width, height, fps } = job;
  const shots = job.shots;
  const lineById = new Map(job.lines.map((l) => [l.id, l]));
  const post = job.postProcessing ?? { colorGrading: false, bgm: false, introOutro: false };

  // 背景音乐素材写入临时目录（循环混入每个镜头，素材不足时自动循环补齐）
  const useBgm = post.bgm && !!job.bgm?.base64;
  let bgmPath: string | undefined;
  if (useBgm && job.bgm) {
    const ext = audioExt(job.bgm.format);
    bgmPath = path.join(workDir, `bgm.${ext}`);
    fs.writeFileSync(bgmPath, Buffer.from(job.bgm.base64, 'base64'));
  }
  const bgmVolume = Math.min(1.5, Math.max(0.05, job.bgm?.volume ?? 0.3));

  try {
    onProgress({ stage: 'assets', percent: 2, message: '素材加载' });

    // 1. 写入分镜图片
    const imagePaths: string[] = [];
    for (let i = 0; i < shots.length; i++) {
      const imgPath = path.join(workDir, `shot-${String(i + 1).padStart(2, '0')}.jpg`);
      const base64 = shots[i].imageBase64.split(',')[1] || shots[i].imageBase64;
      fs.writeFileSync(imgPath, Buffer.from(base64, 'base64'));
      imagePaths.push(imgPath);
    }

    // 2. 配音生成：优先使用配音模块生成的 AI 音频，没有时回退本地 say（非 macOS 自动静音）
    onProgress({ stage: 'tts', percent: 8, message: '配音生成' });
    const audioPaths: Record<string, string | null> = {};
    for (let i = 0; i < job.lines.length; i++) {
      const line = job.lines[i];
      const index = String(i + 1).padStart(2, '0');
      if (line.audioBase64) {
        const ext = line.audioFormat === 'audio/mpeg' ? 'mp3' : 'wav';
        const outPath = path.join(workDir, `line-${index}.${ext}`);
        fs.writeFileSync(outPath, Buffer.from(line.audioBase64, 'base64'));
        audioPaths[line.id] = outPath;
      } else {
        const outPath = path.join(workDir, `line-${index}.aiff`);
        audioPaths[line.id] = await synthesizeSpeech(line, outPath);
      }
      onProgress({
        stage: 'tts',
        percent: 8 + Math.round(((i + 1) / job.lines.length) * 12),
        message: line.audioBase64
          ? `配音接入 ${i + 1}/${job.lines.length}`
          : `本地配音 ${i + 1}/${job.lines.length}`,
      });
    }

    // 3. 逐镜头渲染（Ken Burns 运镜 + 配音混入 + 可选调色/背景音）
    const clipPaths: string[] = [];
    if (post.introOutro) {
      clipPaths.push(
        await renderTitleClip({
          text: job.projectName || 'DramaFlow',
          outputPath: path.join(workDir, 'clip-intro.mp4'),
          width,
          height,
          fps,
          duration: 2.5,
          kind: 'intro',
        })
      );
    }
    for (let i = 0; i < shots.length; i++) {
      const shot = shots[i];
      const clipPath = path.join(workDir, `clip-${String(i + 1).padStart(2, '0')}.mp4`);
      const line = shot.lineId ? lineById.get(shot.lineId) : undefined;
      const audioPath = shot.lineId ? audioPaths[shot.lineId] : undefined;
      // 配音不能比镜头短：镜头时长取 设计时长 与 音频时长+0.2s 的较大值，避免台词被切断
      const audioDuration = audioPath ? await probeDuration(audioPath) : 0;
      let effectiveDuration = Math.max(shot.duration, audioDuration + 0.2);
      if (shot.videoBase64) {
        // AI 生成的视频片段：写入临时文件并统一转码，素材时长不足时末帧定格补齐
        const rawPath = path.join(workDir, `raw-${String(i + 1).padStart(2, '0')}.${videoExt(shot.videoFormat)}`);
        fs.writeFileSync(rawPath, Buffer.from(shot.videoBase64, 'base64'));
        const videoDuration = await probeDuration(rawPath);
        effectiveDuration = Math.max(effectiveDuration, videoDuration);
        await renderAIClip({
          videoPath: rawPath,
          audioPath: audioPath ?? undefined,
          outputPath: clipPath,
          duration: effectiveDuration,
          width,
          height,
          fps,
          volume: line ? line.volume / 100 : undefined,
          colorGrading: post.colorGrading,
          bgmPath,
          bgmVolume,
          bitrate: job.bitrate,
        });
      } else {
        await renderShot({
          imagePath: imagePaths[i],
          audioPath: audioPath ?? undefined,
          outputPath: clipPath,
          duration: effectiveDuration,
          width,
          height,
          fps,
          volume: line ? line.volume / 100 : undefined,
          colorGrading: post.colorGrading,
          bgmPath,
          bgmVolume,
          bitrate: job.bitrate,
        });
      }
      clipPaths.push(clipPath);
      onProgress({
        stage: 'render',
        percent: 20 + Math.round(((i + 1) / shots.length) * 60),
        message: `镜头剪辑 ${i + 1}/${shots.length}`,
        shotIndex: i + 1,
        shotTotal: shots.length,
      });
    }
    if (post.introOutro) {
      clipPaths.push(
        await renderTitleClip({
          text: 'THE END',
          outputPath: path.join(workDir, 'clip-outro.mp4'),
          width,
          height,
          fps,
          duration: 2.5,
          kind: 'outro',
        })
      );
    }

    // 4. 拼接封装
    onProgress({ stage: 'concat', percent: 82, message: '最终封装' });
    const listPath = path.join(workDir, 'list.txt');
    fs.writeFileSync(listPath, clipPaths.map((p) => `file '${p}'`).join('\n'));
    const outputPath = path.join(outputDir, `${job.projectId}-${Date.now()}.mp4`);
    fs.mkdirSync(outputDir, { recursive: true });
    try {
      await execFileAsync(FFMPEG, ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', outputPath], {
        maxBuffer: 64 * 1024 * 1024,
      });
    } catch {
      // 兜底：拼接失败时整体重编码
      const inputs: string[] = [];
      clipPaths.forEach((p) => inputs.push('-i', p));
      const concatPart = clipPaths.map((_, i) => `[${i}:v][${i}:a]`).join('');
      const videoArgs = job.bitrate ? ['-b:v', job.bitrate] : ['-crf', '23'];
      await execFileAsync(
        FFMPEG,
        [
          '-y',
          ...inputs,
          '-filter_complex',
          `${concatPart}concat=n=${clipPaths.length}:v=1:a=1[v][a]`,
          '-map', '[v]',
          '-map', '[a]',
          '-c:v', 'libx264',
          '-preset', 'veryfast',
          ...videoArgs,
          '-c:a', 'aac',
          '-b:a', '128k',
          outputPath,
        ],
        { maxBuffer: 64 * 1024 * 1024 }
      );
    }

    // 5. 校验输出
    const { stdout } = await execFileAsync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration,size', '-of', 'default=nw=1', outputPath]);
    const duration = parseFloat(stdout.match(/duration=([\d.]+)/)?.[1] ?? '0');
    const size = parseInt(stdout.match(/size=(\d+)/)?.[1] ?? '0', 10);
    onProgress({ stage: 'done', percent: 100, message: '合成完成' });
    return { ok: true, outputPath, duration, size };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

interface RenderShotParams {
  imagePath: string;
  audioPath?: string;
  outputPath: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
  volume?: number;
  colorGrading?: boolean;
  /** 背景音乐文件路径（-stream_loop 循环补齐镜头时长） */
  bgmPath?: string;
  /** BGM 音量系数（0~1.5） */
  bgmVolume?: number;
  bitrate?: string;
}

async function renderShot(p: RenderShotParams): Promise<void> {
  const frames = Math.max(1, Math.round(p.duration * p.fps));
  const args = ['-y', '-loop', '1', '-i', p.imagePath];
  if (p.audioPath) {
    args.push('-i', p.audioPath);
  } else {
    args.push('-f', 'lavfi', '-t', String(p.duration), '-i', 'anullsrc=r=44100:cl=stereo');
  }
  if (p.bgmPath) {
    // 真实 BGM：循环补齐镜头时长，结束前 1.5s 淡出
    args.push('-stream_loop', '-1', '-i', p.bgmPath);
  }
  const volume = p.volume != null ? Math.min(1.5, Math.max(0.2, p.volume)) : 0.9;
  let videoChain =
    `[0:v]scale=${p.width}:${p.height}:force_original_aspect_ratio=increase,` +
    `crop=${p.width}:${p.height},` +
    `zoompan=z='min(zoom+0.0015,1.12)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':` +
    `d=${frames}:s=${p.width}x${p.height}:fps=${p.fps}`;
  if (p.colorGrading) {
    // 色调统一：轻微提升对比度与饱和度
    videoChain += ',eq=contrast=1.06:saturation=1.12:brightness=0.015';
  }
  videoChain += ',format=yuv420p[v]';
  let audioFilter: string;
  if (p.bgmPath) {
    const fadeStart = Math.max(0, p.duration - 1.5);
    audioFilter =
      `[1:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,volume=${volume},apad[d0];` +
      `[2:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,` +
      `volume=${p.bgmVolume ?? 0.3},afade=t=out:st=${fadeStart.toFixed(2)}:d=1.5[bg];` +
      `[d0][bg]amix=inputs=2:duration=first:dropout_transition=0[a]`;
  } else {
    audioFilter = `[1:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,volume=${volume},apad[a]`;
  }
  const videoArgs = p.bitrate ? ['-b:v', p.bitrate] : ['-crf', '23'];
  args.push(
    '-filter_complex', `${videoChain};${audioFilter}`,
    '-map', '[v]',
    '-map', '[a]',
    '-t', String(p.duration),
    '-r', String(p.fps),
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    ...videoArgs,
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '128k',
    p.outputPath
  );
  await execFileAsync(FFMPEG, args, { maxBuffer: 64 * 1024 * 1024 });
}

interface AIClipParams {
  videoPath: string;
  audioPath?: string;
  outputPath: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
  volume?: number;
  colorGrading?: boolean;
  bgmPath?: string;
  bgmVolume?: number;
  bitrate?: string;
}

/**
 * AI 视频片段统一转码：缩放裁剪到项目分辨率、统一帧率/编码，
 * 配音优先（替换 AI 视频原声，避免双重人声），可选混入背景音乐。
 */
async function renderAIClip(p: AIClipParams): Promise<void> {
  const args = ['-y', '-i', p.videoPath];

  // 输入序号：0=视频；配音存在时 1=配音；BGM 存在时排在其后
  let dubbingIndex: number | null = null;
  let bgmIndex: number | null = null;
  if (p.audioPath) {
    args.push('-i', p.audioPath);
    dubbingIndex = 1;
  }
  if (p.bgmPath) {
    args.push('-stream_loop', '-1', '-i', p.bgmPath);
    bgmIndex = dubbingIndex === null ? 1 : 2;
  }
  // 无配音、无 BGM 时保留 AI 视频原声，原声缺失则垫静音
  let fallbackIndex: number | null = null;
  if (dubbingIndex === null && bgmIndex === null) {
    if (await hasAudioTrack(p.videoPath)) {
      fallbackIndex = 0;
    } else {
      args.push('-f', 'lavfi', '-t', String(p.duration), '-i', 'anullsrc=r=44100:cl=stereo');
      fallbackIndex = 1;
    }
  }

  const videoDur = await probeDuration(p.videoPath);
  const pad = Math.max(0, p.duration - videoDur);
  let videoChain =
    `[0:v]scale=${p.width}:${p.height}:force_original_aspect_ratio=increase,` +
    `crop=${p.width}:${p.height},setsar=1`;
  if (pad > 0.05) videoChain += `,tpad=stop_mode=clone:stop_duration=${pad.toFixed(2)}`;
  if (p.colorGrading) {
    videoChain += ',eq=contrast=1.06:saturation=1.12:brightness=0.015';
  }
  videoChain += `,fps=${p.fps},format=yuv420p[v]`;

  const fmt = 'aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo';
  let audioFilter: string;
  if (dubbingIndex !== null) {
    const volume = p.volume != null ? Math.min(1.5, Math.max(0.2, p.volume)) : 0.9;
    const dubChain = `[${dubbingIndex}:a]${fmt},volume=${volume},apad[d0]`;
    if (bgmIndex !== null) {
      const fadeStart = Math.max(0, p.duration - 1.5);
      audioFilter =
        `${dubChain};` +
        `[${bgmIndex}:a]${fmt},volume=${p.bgmVolume ?? 0.3},afade=t=out:st=${fadeStart.toFixed(2)}:d=1.5[bg];` +
        `[d0][bg]amix=inputs=2:duration=first:dropout_transition=0[a]`;
    } else {
      audioFilter = `${dubChain}[a]`;
    }
  } else if (bgmIndex !== null) {
    const fadeStart = Math.max(0, p.duration - 1.5);
    audioFilter =
      `[${bgmIndex}:a]${fmt},volume=${p.bgmVolume ?? 0.3},afade=t=out:st=${fadeStart.toFixed(2)}:d=1.5,apad[a]`;
  } else {
    audioFilter = `[${fallbackIndex}:a]${fmt},volume=1.0,apad[a]`;
  }

  const videoArgs = p.bitrate ? ['-b:v', p.bitrate] : ['-crf', '23'];
  args.push(
    '-filter_complex', `${videoChain};${audioFilter}`,
    '-map', '[v]',
    '-map', '[a]',
    '-t', String(p.duration),
    '-r', String(p.fps),
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    ...videoArgs,
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '128k',
    p.outputPath
  );
  await execFileAsync(FFMPEG, args, { maxBuffer: 64 * 1024 * 1024 });
}

/** 判断视频文件是否带音频轨 */
async function hasAudioTrack(filePath: string): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync(
      FFPROBE,
      ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', filePath],
      { maxBuffer: 16 * 1024 * 1024 }
    );
    return String(stdout).trim().length > 0;
  } catch {
    return false;
  }
}

/** 根据 MIME 类型推断视频扩展名 */
function videoExt(format?: string): string {
  const f = format || '';
  if (/webm/i.test(f)) return 'webm';
  if (/quicktime|mov/i.test(f)) return 'mov';
  return 'mp4';
}

/** 根据 MIME 类型推断音频扩展名 */
function audioExt(format?: string): string {
  const f = format || '';
  if (/mpeg|mp3/i.test(f)) return 'mp3';
  if (/ogg|opus/i.test(f)) return 'ogg';
  if (/flac/i.test(f)) return 'flac';
  if (/wav|x-wav/i.test(f)) return 'wav';
  if (/m4a|mp4|aac/i.test(f)) return 'm4a';
  return 'mp3';
}

/** 探测音频/视频文件时长（秒），失败返回 0 */
async function probeDuration(filePath: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync(
      FFPROBE,
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', filePath],
      { maxBuffer: 16 * 1024 * 1024 }
    );
    const d = parseFloat(String(stdout).trim());
    return Number.isFinite(d) && d > 0 ? d : 0;
  } catch {
    return 0;
  }
}

/** 查找可用的中文字体（片头片尾文字用），找不到则返回 null（只渲染色块卡片） */
function resolveFontPath(): string | null {
  const candidates =
    process.platform === 'darwin'
      ? ['/System/Library/Fonts/PingFang.ttc', '/System/Library/Fonts/STHeiti Light.ttc', '/System/Library/Fonts/Helvetica.ttc']
      : process.platform === 'win32'
        ? ['C:\\Windows\\Fonts\\msyh.ttc', 'C:\\Windows\\Fonts\\simhei.ttf']
        : ['/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc', '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'];
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

/** 转义 drawtext 文本中的特殊字符 */
function escapeDrawText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/:/g, '\\:')
    .replace(/%/g, '\\%')
    .replace(/,/g, '\\,');
}

/** 渲染片头/片尾卡片（纯色 + 项目名文字 + 琥珀色装饰条） */
async function renderTitleClip(p: {
  text: string;
  outputPath: string;
  width: number;
  height: number;
  fps: number;
  duration: number;
  kind: 'intro' | 'outro';
}): Promise<string> {
  const font = resolveFontPath();
  if (font) {
    try {
      return await renderTitleClipWithText(p, font);
    } catch (err) {
      // drawtext 不可用（如 Homebrew ffmpeg 未编译 libfreetype）时静默降级为纯色卡片
      const msg = err instanceof Error ? err.message : String(err);
      if (!/No such filter|drawtext/i.test(msg)) throw err;
    }
  }
  return renderTitleClipPlain(p);
}

async function renderTitleClipWithText(
  p: { text: string; outputPath: string; width: number; height: number; fps: number; duration: number; kind: 'intro' | 'outro' },
  font: string
): Promise<string> {
  const bg = p.kind === 'intro' ? '0x232833' : '0x16181F';
  const args = [
    '-y',
    '-f', 'lavfi',
    '-i', `color=c=${bg}:s=${p.width}x${p.height}:d=${p.duration}:r=${p.fps}`,
    '-f', 'lavfi',
    '-t', String(p.duration),
    '-i', 'anullsrc=r=44100:cl=stereo',
  ];
  const filters = [
    `drawbox=x=0:y=0:w=iw:h=${Math.max(8, Math.round(p.height * 0.012))}:color=0xE69500@0.9:t=fill`,
  ];
  const fontSize = p.kind === 'intro' ? Math.round(p.height * 0.055) : Math.round(p.height * 0.05);
  filters.push(
    `drawtext=fontfile='${font}':text='${escapeDrawText(p.text)}':` +
      `fontcolor=white:fontsize=${fontSize}:x=(w-text_w)/2:y=(h-text_h)/2`
  );
  args.push(
    '-vf', filters.join(','),
    '-map', '0:v',
    '-map', '1:a',
    '-t', String(p.duration),
    '-r', String(p.fps),
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '23',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '128k',
    p.outputPath
  );
  await execFileAsync(FFMPEG, args, { maxBuffer: 64 * 1024 * 1024 });
  return p.outputPath;
}

/** 无文字片头/片尾（drawtext 不可用时的降级方案） */
async function renderTitleClipPlain(p: {
  outputPath: string;
  width: number;
  height: number;
  fps: number;
  duration: number;
  kind: 'intro' | 'outro';
}): Promise<string> {
  const bg = p.kind === 'intro' ? '0x232833' : '0x16181F';
  const args = [
    '-y',
    '-f', 'lavfi',
    '-i', `color=c=${bg}:s=${p.width}x${p.height}:d=${p.duration}:r=${p.fps}`,
    '-f', 'lavfi',
    '-t', String(p.duration),
    '-i', 'anullsrc=r=44100:cl=stereo',
    '-vf', `drawbox=x=0:y=0:w=iw:h=${Math.max(8, Math.round(p.height * 0.012))}:color=0xE69500@0.9:t=fill`,
    '-map', '0:v',
    '-map', '1:a',
    '-t', String(p.duration),
    '-r', String(p.fps),
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '23',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '128k',
    p.outputPath,
  ];
  await execFileAsync(FFMPEG, args, { maxBuffer: 64 * 1024 * 1024 });
  return p.outputPath;
}

async function synthesizeSpeech(line: SynthesisLineInput, outPath: string): Promise<string | null> {
  if (process.platform !== 'darwin') return null;
  const rate = Math.round(160 * Math.min(2, Math.max(0.5, line.speed || 1)));
  try {
    await execFileAsync(SAY, ['-v', 'Tingting', '-r', String(rate), '-o', outPath, line.text], {
      maxBuffer: 16 * 1024 * 1024,
    });
    return fs.existsSync(outPath) ? outPath : null;
  } catch {
    return null;
  }
}
