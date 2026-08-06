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
}

export interface SynthesisJobInput {
  projectId: string;
  projectName: string;
  shots: SynthesisShotInput[];
  lines: SynthesisLineInput[];
  fps: number;
  width: number;
  height: number;
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

    // 2. 本地配音生成（macOS say，中文语音；非 macOS 自动降级为静音）
    onProgress({ stage: 'tts', percent: 8, message: '配音生成' });
    const audioPaths: Record<string, string | null> = {};
    for (let i = 0; i < job.lines.length; i++) {
      const line = job.lines[i];
      const outPath = path.join(workDir, `line-${String(i + 1).padStart(2, '0')}.aiff`);
      audioPaths[line.id] = await synthesizeSpeech(line, outPath);
      onProgress({
        stage: 'tts',
        percent: 8 + Math.round(((i + 1) / job.lines.length) * 12),
        message: `配音生成 ${i + 1}/${job.lines.length}`,
      });
    }

    // 3. 逐镜头渲染（Ken Burns 运镜 + 配音混入）
    const clipPaths: string[] = [];
    for (let i = 0; i < shots.length; i++) {
      const shot = shots[i];
      const clipPath = path.join(workDir, `clip-${String(i + 1).padStart(2, '0')}.mp4`);
      const line = shot.lineId ? lineById.get(shot.lineId) : undefined;
      const audioPath = shot.lineId ? audioPaths[shot.lineId] : undefined;
      await renderShot({
        imagePath: imagePaths[i],
        audioPath: audioPath ?? undefined,
        outputPath: clipPath,
        duration: shot.duration,
        width,
        height,
        fps,
        volume: line ? line.volume / 100 : undefined,
      });
      clipPaths.push(clipPath);
      onProgress({
        stage: 'render',
        percent: 20 + Math.round(((i + 1) / shots.length) * 60),
        message: `镜头剪辑 ${i + 1}/${shots.length}`,
        shotIndex: i + 1,
        shotTotal: shots.length,
      });
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
          '-crf', '23',
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
}

async function renderShot(p: RenderShotParams): Promise<void> {
  const frames = Math.max(1, Math.round(p.duration * p.fps));
  const args = ['-y', '-loop', '1', '-i', p.imagePath];
  if (p.audioPath) {
    args.push('-i', p.audioPath);
  } else {
    args.push('-f', 'lavfi', '-t', String(p.duration), '-i', 'anullsrc=r=44100:cl=stereo');
  }
  const volume = p.volume != null ? Math.min(1.5, Math.max(0.2, p.volume)) : 0.9;
  const videoFilter =
    `[0:v]scale=${p.width}:${p.height}:force_original_aspect_ratio=increase,` +
    `crop=${p.width}:${p.height},` +
    `zoompan=z='min(zoom+0.0015,1.12)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':` +
    `d=${frames}:s=${p.width}x${p.height}:fps=${p.fps},format=yuv420p[v]`;
  const audioFilter =
    `[1:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,volume=${volume},apad[a]`;
  args.push(
    '-filter_complex', `${videoFilter};${audioFilter}`,
    '-map', '[v]',
    '-map', '[a]',
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
