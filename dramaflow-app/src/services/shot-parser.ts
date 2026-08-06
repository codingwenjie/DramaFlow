import type { Shot } from '../data/types';

export interface ParsedShotLine {
  type: string;
  angle: string;
  duration: string;
  desc: string;
}

/**
 * 分镜解析器：把 AI 生成的镜头列表解析为结构化镜头。
 *
 * 期望格式（每行一个镜头）：
 * 全景|平视|3.5|咖啡馆全景，阳光透过玻璃
 * 中景|微俯|2.0|林晓脚下绊倒
 *
 * 容错：缺少分段时按纯描述处理，时长默认 3s。
 */
export function parseShotLines(text: string): ParsedShotLine[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const cleaned = line.replace(/^[-*\d.\s、]+/, '');
      const parts = cleaned.split('|').map((s) => s.trim());

      if (parts.length >= 4) {
        const [type, angle, duration, ...descParts] = parts;
        return {
          type: type || '中景',
          angle: angle || '平视',
          duration: normalizeDuration(duration),
          desc: descParts.join('|'),
        };
      }
      if (parts.length === 3) {
        const [a, b, c] = parts;
        if (/([\d.]+)\s*s?$/.test(b)) {
          return { type: a || '中景', angle: '平视', duration: normalizeDuration(b), desc: c };
        }
        return { type: a || '中景', angle: b || '平视', duration: '3s', desc: c };
      }
      return { type: '中景', angle: '平视', duration: '3s', desc: cleaned };
    });
}

/** 解析为完整的 Shot 数据（写入项目模块存储用） */
export function parseShotsToShots(text: string, projectId: string, scene: number): Shot[] {
  return parseShotLines(text).map((s, i) => ({
    id: `#${scene}-${String(i + 1).padStart(2, '0')}`,
    projectId,
    scene,
    type: s.type,
    angle: s.angle,
    duration: s.duration,
    desc: s.desc,
    status: 'done' as const,
    img: '',
  }));
}

function normalizeDuration(raw: string): string {
  const match = raw.match(/([\d.]+)/);
  return match ? `${match[1]}s` : '3s';
}
