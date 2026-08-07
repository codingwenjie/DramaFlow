import { generateId } from '../data/storage';
import type { Character, Episode } from '../data/types';
import { extractCharacters } from './script-format';

const ROLE_COLORS = ['#2563EB', '#E69500', '#16A34A', '#7C3AED', '#DB2777', '#0891B2'];
const DEFAULT_VOICES = [
  '女声-清甜自然',
  '男声-沉稳磁性',
  '女声-温柔知性',
  '男声-冷峻总裁',
  '女声-活泼元气',
  '男声-阳光活力',
];

/** 从剧本幕次中提取角色名：幕头「人物：X、Y」 + 「角色名：台词」行 */
export function extractCharacterNames(episodes: Episode[]): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const ep of episodes) {
    for (const n of ep.characters ?? []) {
      const name = n.trim();
      if (name && !seen.has(name)) {
        seen.add(name);
        names.push(name);
      }
    }
    for (const name of extractCharacters(ep.content)) {
      if (name && !seen.has(name)) {
        seen.add(name);
        names.push(name);
      }
    }
  }
  return names;
}

/**
 * 把剧本中的角色合并进角色列表：
 * - 已存在的角色（按名字匹配）保持不变
 * - 剧本里新出现的角色自动补齐默认档案
 */
export function syncCharactersFromScript(
  characters: Character[],
  episodes: Episode[]
): Character[] {
  const names = extractCharacterNames(episodes);
  if (names.length === 0) return characters;

  const existing = new Set(characters.map((c) => c.name));
  const leadName = episodes[0]?.characters?.[0]?.trim();
  const result = [...characters];
  let idx = characters.length;

  for (const name of names) {
    if (existing.has(name)) continue;
    result.push({
      id: generateId(),
      projectId: characters[0]?.projectId ?? '',
      name,
      role: name === leadName ? '主角' : '配角',
      color: ROLE_COLORS[idx % ROLE_COLORS.length],
      avatarUrl: '',
      stats: { scenes: 0, lines: 0 },
      profile: { age: 25, gender: '未设定', occupation: '', personality: '' },
      description: '',
      suggestions: [],
      lineDistribution: { dialog: 60, monologue: 25, aside: 15 },
      currentVoice: DEFAULT_VOICES[0],
      voices: DEFAULT_VOICES,
    });
    existing.add(name);
    idx += 1;
  }
  return result;
}
