import { generateId, loadPersistent, savePersistent } from './storage';
import type { AIModelPurpose, PromptTemplate } from './types';

const PROMPTS_KEY = 'dramaflow-prompts';

/** 支持自定义 Prompt 模板的用途 */
export const PROMPT_PURPOSES: { purpose: AIModelPurpose; label: string }[] = [
  { purpose: 'script', label: '剧本生成' },
  { purpose: 'polish', label: '剧本润色' },
  { purpose: 'storyboard', label: '分镜生成' },
  { purpose: 'character', label: '人设生成' },
  { purpose: 'suggestion', label: '优化建议' },
];

/** 各用途的默认系统提示词（与生成链路内置行为一致，作为回退与内置模板内容） */
export const DEFAULT_SYSTEM_PROMPTS: Record<string, string> = {
  script:
    '你是一位资深短剧编剧，擅长创作节奏紧凑、冲突强烈的短剧剧本。' +
    '你必须严格按照以下结构化格式输出每一幕，不要输出多余的解释：\n' +
    '### 第N幕 ｜ 场景：内景/外景·地点·时间 ｜ 人物：角色A、角色B\n\n' +
    '【场景描述】\n（场景与动作描写）\n\n角色A：（情绪）台词\n角色B：台词',
  storyboard:
    '你是一位专业分镜师，擅长将剧本转化为具体的镜头语言描述。' +
    '你必须严格按照以下格式每行输出一个镜头，不要输出序号、编号或任何解释：\n' +
    '镜头类型|拍摄角度|时长秒|镜头描述|视频提示词|配乐风格|音效',
  character:
    '你是一位人物设定专家，擅长为短剧角色创作立体丰满的人设。' +
    '输出请使用简洁的 Markdown 格式：' +
    '「## 角色定位」「## 性格特征」（要点列表）、「## 背景故事」「## 人物弧光」。' +
    '严禁输出开场白（如“好的”“以下是…”）和结尾客套（如“以上就是”“希望有帮助”）以及任何与人物无关的解释。',
  suggestion: '你是一位短剧创作顾问，擅长给出具体、可执行的改进建议。',
  polish: '你是一位资深剧本编辑，擅长优化台词节奏、增强戏剧冲突。',
};

/** 内置模板（首次使用时播种到存储，可编辑、可禁用、不可删除） */
function builtinTemplates(): PromptTemplate[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'builtin-script',
      name: '默认剧本生成',
      purpose: 'script',
      desc: '结构化短剧剧本：逐幕输出场景描述与角色台词，格式固定便于解析落库',
      content: DEFAULT_SYSTEM_PROMPTS.script,
      enabled: true,
      builtin: true,
      updatedAt: now,
    },
    {
      id: 'builtin-script-punchy',
      name: '快节奏爽点剧本',
      purpose: 'script',
      desc: '每幕前置钩子、节奏更快：对白短促、每幕必有一个反转或情绪爆点',
      content:
        '你是一位专攻短视频平台爆款的短剧编剧，擅长“黄金三秒”式开场与密集爽点。' +
        '严格按照以下结构化格式输出每一幕，不要输出多余的解释：\n' +
        '### 第N幕 ｜ 场景：内景/外景·地点·时间 ｜ 人物：角色A、角色B\n\n' +
        '【场景描述】\n（场景与动作描写，不超过两句）\n\n角色A：（情绪）台词\n角色B：台词\n\n' +
        '硬性要求：\n' +
        '1. 第一幕开头 3 句话内必须抛出核心冲突\n' +
        '2. 每幕结尾留一个钩子（悬念/反转/情绪爆点）\n' +
        '3. 台词每句不超过 15 字，禁止书面化长句',
      enabled: false,
      builtin: true,
      updatedAt: now,
    },
    {
      id: 'builtin-storyboard',
      name: '默认分镜生成',
      purpose: 'storyboard',
      desc: '逐镜头输出「类型|角度|时长|描述|视频提示词|配乐|音效」，供解析落库',
      content: DEFAULT_SYSTEM_PROMPTS.storyboard,
      enabled: true,
      builtin: true,
      updatedAt: now,
    },
    {
      id: 'builtin-character',
      name: '默认人设生成',
      purpose: 'character',
      desc: 'Markdown 结构人设：定位、性格、背景、人物弧光',
      content: DEFAULT_SYSTEM_PROMPTS.character,
      enabled: true,
      builtin: true,
      updatedAt: now,
    },
    {
      id: 'builtin-suggestion',
      name: '默认优化建议',
      purpose: 'suggestion',
      desc: '给出具体、可执行的 3-5 条优化建议',
      content: DEFAULT_SYSTEM_PROMPTS.suggestion,
      enabled: true,
      builtin: true,
      updatedAt: now,
    },
    {
      id: 'builtin-polish',
      name: '默认剧本润色',
      purpose: 'polish',
      desc: '优化台词节奏、增强戏剧冲突',
      content: DEFAULT_SYSTEM_PROMPTS.polish,
      enabled: true,
      builtin: true,
      updatedAt: now,
    },
  ];
}

export function loadPromptTemplates(): PromptTemplate[] {
  const raw = loadPersistent(PROMPTS_KEY);
  if (!raw) {
    const seeded = builtinTemplates();
    savePromptTemplates(seeded);
    return seeded;
  }
  try {
    const parsed = JSON.parse(raw) as PromptTemplate[];
    if (!Array.isArray(parsed) || parsed.length === 0) return builtinTemplates();
    // 存储中缺失的内置模板（版本升级新增）自动补入
    const have = new Set(parsed.map((t) => t.id));
    for (const b of builtinTemplates()) {
      if (!have.has(b.id)) parsed.push(b);
    }
    return parsed;
  } catch {
    return builtinTemplates();
  }
}

export function savePromptTemplates(templates: PromptTemplate[]): void {
  savePersistent(PROMPTS_KEY, JSON.stringify(templates));
}

/** 取某用途当前启用的模板；未启用任何模板时返回 null（生成链路回退默认提示词） */
export function getActivePrompt(purpose: AIModelPurpose): PromptTemplate | null {
  return loadPromptTemplates().find((t) => t.purpose === purpose && t.enabled) ?? null;
}

/** 新建自定义模板（同用途已有启用模板时默认不启用） */
export function createPromptTemplate(
  input: Pick<PromptTemplate, 'name' | 'purpose' | 'desc' | 'content'>
): PromptTemplate[] {
  const templates = loadPromptTemplates();
  const template: PromptTemplate = {
    ...input,
    id: `prompt-${generateId()}`,
    enabled: !templates.some((t) => t.purpose === input.purpose && t.enabled),
    builtin: false,
    updatedAt: new Date().toISOString(),
  };
  const next = [...templates, template];
  savePromptTemplates(next);
  return next;
}

/** 更新模板内容；当把某模板启用时，自动禁用同用途的其他模板 */
export function updatePromptTemplate(id: string, patch: Partial<PromptTemplate>): PromptTemplate[] {
  const templates = loadPromptTemplates();
  const target = templates.find((t) => t.id === id);
  if (!target) return templates;
  let next = templates.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t));
  if (patch.enabled === true) {
    next = next.map((t) =>
      t.id !== id && t.purpose === target.purpose ? { ...t, enabled: false } : t
    );
  }
  savePromptTemplates(next);
  return next;
}

export function deletePromptTemplate(id: string): PromptTemplate[] {
  const next = loadPromptTemplates().filter((t) => t.id !== id || t.builtin);
  savePromptTemplates(next);
  return next;
}

/** 重置：清空自定义模板并重新播种内置模板 */
export function resetPromptTemplates(): PromptTemplate[] {
  const seeded = builtinTemplates();
  savePromptTemplates(seeded);
  return seeded;
}
