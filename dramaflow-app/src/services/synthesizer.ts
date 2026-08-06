import { loadModuleData } from '../data/storage';
import type { DubbingLine, Shot, SynthesisConfig } from '../data/types';
import type { SynthesisJobInput } from '../../electron/synthesis';

/**
 * 渲染进程侧的合成任务组装：
 * 1. 从项目数据加载分镜与配音台词
 * 2. 用 Canvas 生成分镜图（真实分镜图缺失时生成带字幕的占位图）
 * 3. 组装 SynthesisJobInput 交给 Electron 主进程本地合成
 */
export async function buildSynthesisJob(
  projectId: string,
  projectName: string,
  config: SynthesisConfig,
  orientation: 'vertical' | 'horizontal'
): Promise<{ job: SynthesisJobInput; shotCount: number } | null> {
  const shots = loadModuleData<Shot[]>(projectId, 'shots', []);
  const lines = loadModuleData<DubbingLine[]>(projectId, 'dubbing', []);
  if (!shots.length) return null;

  // 按镜头编号排序（#001 → #008）
  const sorted = [...shots].sort((a, b) => {
    const na = parseInt(String(a.id).replace(/\D/g, ''), 10) || 0;
    const nb = parseInt(String(b.id).replace(/\D/g, ''), 10) || 0;
    return na - nb || a.scene - b.scene;
  });

  // 台词按幕次排队，逐镜头分配；旁白/舞台提示（括号开头）跳过
  const queues = new Map<number, DubbingLine[]>();
  for (const l of lines) {
    if (!l.text || /^[（(]/.test(l.text)) continue;
    if (!queues.has(l.scene)) queues.set(l.scene, []);
    queues.get(l.scene)!.push(l);
  }

  const vertical = orientation !== 'horizontal';
  const width = vertical ? 1080 : 1920;
  const height = vertical ? 1920 : 1080;
  const jobShots = [];
  const assignedLines: DubbingLine[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const shot = sorted[i];
    const line = queues.get(shot.scene)?.shift();
    if (line) assignedLines.push(line);
    const duration = parseFloat(shot.duration) || 3;
    const imageBase64 = await generateShotImage(shot, i + 1, line?.text ?? '', vertical);
    jobShots.push({
      id: shot.id,
      scene: shot.scene,
      index: i + 1,
      imageBase64,
      duration,
      desc: shot.desc,
      type: shot.type,
      angle: shot.angle,
      lineId: line?.id,
    });
  }

  const job: SynthesisJobInput = {
    projectId,
    projectName,
    shots: jobShots,
    lines: assignedLines.map((l) => ({
      id: l.id,
      scene: l.scene,
      character: l.character,
      text: l.text,
      speed: l.speed,
      volume: l.volume,
    })),
    fps: config.fps || 30,
    width,
    height,
  };
  return { job, shotCount: jobShots.length };
}

/** 生成单张分镜图（竖屏 1080×1920 / 横屏 1920×1080），返回 JPEG dataURL */
async function generateShotImage(
  shot: Shot,
  index: number,
  subtitle: string,
  vertical: boolean
): Promise<string> {
  const W = vertical ? 1080 : 1920;
  const H = vertical ? 1920 : 1080;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 背景渐变
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#232833');
  bg.addColorStop(1, '#16181F');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // 琥珀色氛围光
  const glow = ctx.createRadialGradient(W * 0.85, H * 0.1, 0, W * 0.85, H * 0.1, W * 0.45);
  glow.addColorStop(0, 'rgba(230,149,0,0.30)');
  glow.addColorStop(1, 'rgba(230,149,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // 已有分镜图时作为底图
  if (shot.img) {
    try {
      const img = await loadImage(shot.img);
      drawCover(ctx, img, W, H);
      ctx.fillStyle = 'rgba(10,12,16,0.55)';
      ctx.fillRect(0, 0, W, H);
    } catch {
      // 图片加载失败则继续使用占位背景
    }
  }

  const margin = W * 0.066;
  const big = vertical ? 150 : 96;
  const body = vertical ? 52 : 40;

  // 场景编号
  ctx.font = `600 ${vertical ? 44 : 34}px Inter, sans-serif`;
  ctx.fillStyle = '#E69500';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`SCENE ${String(shot.scene).padStart(2, '0')}`, margin, H * 0.038);

  // 镜头类型 / 角度标签
  const chipText = `${shot.type} · ${shot.angle}`;
  ctx.font = `500 ${vertical ? 38 : 30}px Inter, sans-serif`;
  const chipW = ctx.measureText(chipText).width + 56;
  const chipH = vertical ? 64 : 52;
  const chipY = H * 0.075;
  roundRect(ctx, margin, chipY, chipW, chipH, chipH / 2);
  ctx.fillStyle = 'rgba(230,149,0,0.14)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(245,200,66,0.7)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#F5C842';
  ctx.fillText(chipText, margin + 28, chipY + (chipH - (vertical ? 38 : 30)) / 2);

  // 镜头编号
  ctx.font = `700 ${big}px Outfit, sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(`#${String(index).padStart(3, '0')}`, margin, H * 0.16);

  // 镜头描述（自动换行）
  ctx.font = `400 ${body}px "PingFang SC", sans-serif`;
  ctx.fillStyle = '#C9CDD8';
  const descLines = wrapText(ctx, shot.desc || '镜头描述', W - margin * 2, vertical ? 8 : 5);
  let descY = H * 0.28;
  for (const line of descLines) {
    ctx.fillText(line, margin, descY);
    descY += body * 1.42;
  }

  // 底部字幕条
  const subH = vertical ? 360 : 240;
  const subY = H - subH;
  ctx.fillStyle = 'rgba(0,0,0,0.62)';
  ctx.fillRect(0, subY, W, subH);
  ctx.fillStyle = '#E69500';
  ctx.fillRect(0, subY, 10, subH);
  ctx.font = `600 ${vertical ? 52 : 40}px "PingFang SC", sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  const subLines = wrapText(ctx, subtitle || shot.desc || '', W - margin * 2, vertical ? 4 : 3);
  let subYText = subY + (vertical ? 64 : 42);
  for (const line of subLines) {
    ctx.fillText(line, margin + 8, subYText);
    subYText += vertical ? 72 : 54;
  }

  // 水印
  ctx.font = `400 ${vertical ? 28 : 22}px Inter, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.textAlign = 'right';
  ctx.fillText('DramaFlow · AI 分镜占位', W - margin, H - 40);

  return canvas.toDataURL('image/jpeg', 0.85);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, W: number, H: number): void {
  const scale = Math.max(W / img.width, H / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const chars = Array.from(text);
  const lines: string[] = [];
  let current = '';
  for (const ch of chars) {
    const test = current + ch;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = ch;
      if (lines.length >= maxLines) break;
    } else {
      current = test;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines;
}
