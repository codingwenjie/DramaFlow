/**
 * 剧本文本工具：格式化与角色提取（纯本地，不依赖 AI）。
 */

/** 格式化剧本正文：统一台词行冒号、压缩多余空行与空格 */
export function normalizeScript(content: string): string {
  const lines = content.split('\n');
  const out: string[] = [];
  let prevBlank = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (!prevBlank && out.length > 0) out.push('');
      prevBlank = true;
      continue;
    }
    prevBlank = false;
    out.push(normalizeDialogueLine(line));
  }

  while (out.length && out[0] === '') out.shift();
  while (out.length && out[out.length - 1] === '') out.pop();
  return out.join('\n');
}

/** 台词行规范化：`角色名: 内容` → `角色名：内容`；非台词行压缩多余空格 */
function normalizeDialogueLine(line: string): string {
  const match = line.match(/^([^:：]{1,8})\s*[:：]\s*(.+)$/);
  if (match) {
    const name = match[1].trim();
    const rest = match[2].trim();
    const skipNames = /^(场景|时间|地点|人物|角色|旁白|字幕|画外音|备注)/;
    if (!/^[【\[]/.test(name) && !skipNames.test(name)) {
      return `${name}：${rest}`;
    }
  }
  return line.replace(/\s{2,}/g, ' ');
}

/** 从正文提取出场角色（台词行 `角色名：内容` 的角色名，自动去重） */
export function extractCharacters(content: string): string[] {
  const names = new Set<string>();
  const skipNames = /^(场景|时间|地点|人物|角色|旁白|字幕|画外音|备注|OS|V\.O|转场)/i;

  for (const raw of content.split('\n')) {
    const line = raw.trim();
    const match = line.match(/^([^:：]{1,8})\s*[:：]\s*(.+)$/);
    if (!match) continue;
    const name = match[1].trim();
    if (!name || name.length > 8) continue;
    if (/^[【\[]/.test(name)) continue;
    if (skipNames.test(name)) continue;
    if (/^[\d.、\-—]+$/.test(name)) continue;
    names.add(name);
  }
  return Array.from(names);
}
