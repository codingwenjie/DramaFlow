import { generateModuleId } from '../data/storage';
import type { Episode } from '../data/types';

/**
 * 剧本解析器：把 AI 生成的结构化剧本文本解析为幕次数组。
 *
 * 期望格式：
 * ### 第1幕 ｜ 场景：内景·咖啡馆·白天 ｜ 人物：林晓、陈诺
 *
 * 【场景描述】
 * 咖啡馆全景……
 *
 * 林晓：（慌乱）对不起！
 * 陈诺：没事。
 *
 * 容错：无 ### 标记时整体作为第一幕；信息缺失时使用默认值。
 */
export function parseScriptToEpisodes(text: string, projectId: string): Episode[] {
  const blocks = text
    .split(/^#{2,4}\s*/m)
    .map((b) => b.trim())
    .filter(Boolean);

  if (blocks.length === 0) return [];

  return blocks.map((block, idx) => {
    const lines = block.split('\n');
    const titleLine = lines[0] || '';
    const sceneMatch = titleLine.match(/第\s*(\d+)\s*幕/);
    const sceneNumber = sceneMatch ? parseInt(sceneMatch[1], 10) : idx + 1;
    const title = stripMeta(titleLine) || `第${sceneNumber}幕`;
    const sceneInfo = parseSceneInfo(titleLine);
    const characters = parseCharacters(titleLine);
    const content = lines
      .slice(1)
      .join('\n')
      .trim()
      // 去掉解析时可能残留的标题元信息行
      .replace(/^(场景|人物|角色|演员)[:：].*\n?/g, '')
      .trim();

    return {
      id: generateModuleId('s'),
      projectId,
      title,
      sceneNumber,
      type: sceneInfo.type,
      location: sceneInfo.location,
      time: sceneInfo.time,
      characters,
      words: countWords(content),
      content,
    };
  });
}

/** 提取标题（去掉 ｜ 后的元信息） */
function stripMeta(line: string): string {
  const cleaned = line.split(/[｜|]/)[0].trim();
  return cleaned === '' ? '' : cleaned;
}

function parseSceneInfo(line: string): { type: string; location: string; time: string } {
  const match = line.match(/场景\s*[:：]\s*([^｜|]+)/);
  if (!match) return { type: '内景', location: '待定', time: '白天' };
  const segments = match[1]
    .split(/[·、/|]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const type = segments.find((s) => /内景|外景|室内|室外/.test(s)) || '内景';
  const time = segments.find((s) => /清晨|白天|傍晚|黄昏|夜晚|深夜/.test(s)) || '白天';
  const location = segments.find((s) => s !== type && s !== time) || '待定';
  return { type, location, time };
}

function parseCharacters(line: string): string[] {
  const match = line.match(/(?:人物|角色|演员)\s*[:：]\s*([^｜|]+)/);
  if (!match) return [];
  return match[1]
    .split(/[、,，\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 粗略字数统计：去掉空白后的字符数 */
export function countWords(content: string): number {
  return content.replace(/\s/g, '').length;
}
