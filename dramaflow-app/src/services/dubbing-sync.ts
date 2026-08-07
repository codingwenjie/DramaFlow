import type { Character, DubbingLine, Episode } from '../data/types';

/** 把中文情绪词映射为配音情绪 id */
function mapEmotion(word: string): string {
  const w = word.replace(/[（()）\s]/g, '');
  if (/慌乱|紧张|害怕|恐惧/.test(w)) return 'fear';
  if (/生气|愤怒|怒吼/.test(w)) return 'angry';
  if (/开心|笑|高兴|愉快/.test(w)) return 'happy';
  if (/悲伤|哭|难过|伤心/.test(w)) return 'sad';
  if (/惊讶|震惊|意外/.test(w)) return 'surprise';
  return 'calm';
}

/** 从剧本幕次中提取台词行（角色名：台词），返回 DubbingLine 列表 */
export function extractDubbingLinesFromEpisodes(
  episodes: Episode[],
  characters: Character[]
): DubbingLine[] {
  const lines: DubbingLine[] = [];
  const skipNames = /^(场景|时间|地点|人物|角色|旁白|字幕|画外音|备注|OS|V\.O|转场)/i;
  let seq = 1;

  for (const ep of episodes) {
    for (const raw of ep.content.split('\n')) {
      const line = raw.trim();
      const m = line.match(/^([^：:]{1,8})[：:]\s*(.+)$/);
      if (!m) continue;
      const name = m[1].trim();
      if (!name || name.length > 8) continue;
      if (/^[【\[]/.test(name)) continue;
      if (skipNames.test(name)) continue;
      if (/^[\d.、\-—]+$/.test(name)) continue;

      let emotion = 'calm';
      let text = m[2].trim();
      const em = text.match(/^（([^）]+)）\s*/);
      if (em) {
        emotion = mapEmotion(em[1]);
        text = text.slice(em[0].length).trim();
      }
      if (!text) continue;

      const char = characters.find((c) => c.name === name);
      lines.push({
        id: `d${String(seq).padStart(3, '0')}`,
        projectId: ep.projectId,
        scene: ep.sceneNumber,
        character: name,
        characterColor: char?.color ?? '#9AA0B0',
        text,
        status: 'pending',
        duration: '',
        emotion,
        speed: 1.0,
        volume: 80,
        audioUrl: '',
      });
      seq += 1;
    }
  }
  return lines;
}

/**
 * 把剧本台词合并进已有配音列表：
 * - 已有条目（按 幕次+角色+文本 匹配）保留用户设置与已生成音频
 * - 剧本里新增的台词自动补入
 * - 用户手动添加的旧条目保留在末尾
 */
export function syncDubbingLines(
  existing: DubbingLine[],
  scriptLines: DubbingLine[]
): DubbingLine[] {
  if (scriptLines.length === 0) return existing;

  const keyOf = (l: DubbingLine) => `${l.scene}|${l.character}|${l.text}`;
  const existingByKey = new Map<string, DubbingLine>();
  for (const l of existing) existingByKey.set(keyOf(l), l);

  const merged = scriptLines.map((sl) => {
    const old = existingByKey.get(keyOf(sl));
    if (!old) return sl;
    return {
      ...sl,
      id: old.id,
      status: old.status,
      duration: old.duration,
      emotion: old.emotion,
      speed: old.speed,
      volume: old.volume,
      audioUrl: old.audioUrl,
    };
  });

  // 保留用户手动添加但不在剧本中的条目
  const scriptKeys = new Set(scriptLines.map(keyOf));
  for (const l of existing) {
    if (!scriptKeys.has(keyOf(l))) merged.push(l);
  }
  return merged;
}
