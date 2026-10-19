import {
  AIService,
  AIGenerateScriptParams,
  AIGenerateShotsParams,
  AIDubbingParams,
  AIGenerateCharacterParams,
  AIGenerateSuggestionParams,
  AIGenerateImageParams,
} from './ai';
import { AIModelConfig, AIModelPurpose } from '../data/types';
import { requestAIJSON, normalizeError } from './ai-http';
import { getImageAdapter, getTTSAdapter } from './provider-adapters';
import { testVideoConnection } from './video-generation';

interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

const CHAT_PURPOSES = ['script', 'polish', 'storyboard', 'character', 'suggestion', 'generic'];

/** 判断某行是否为 AI 常见的开场引导句（“好的，以下是林薇的人设：”等） */
function isFillerLead(line: string): boolean {
  if (!line || line.length > 40) return false;
  if (/[：:，,。!！]$/.test(line)) {
    return /^(好的|好的，|好的！|以下是|下面|这是|为你|我来|你好|您好|根据你的|根据您|关于|人设如下|角色设定如下|人物设定如下)/.test(line);
  }
  return line.length <= 12 && /^(好的|以下是|下面|这是|为你|我来|你好|您好|根据|关于)/.test(line);
}

/** 判断某行是否为 AI 常见的结尾客套/总结句（“以上就是林薇的人设”等） */
function isFillerTail(line: string): boolean {
  if (!line || line.length > 40) return false;
  return /^(以上|以上就是|希望|如果|如有|这样|祝|仅供参考|内容仅供参考|若有|如果需要|可以根据|总的来说|总之|请根据)/.test(line);
}

/** 清理 AI 人设输出：去掉开头引导句与结尾客套句，只保留正文 */
function cleanCharacterDescription(text: string): string {
  const lines = text.split('\n');
  while (lines.length && isFillerLead(lines[0].trim())) lines.shift();
  while (lines.length && isFillerTail(lines[lines.length - 1].trim())) lines.pop();
  return lines.join('\n').trim();
}

/** 核心 Chat Completions 调用：带超时与统一错误处理 */
async function chatCompletion(
  config: AIModelConfig,
  systemPrompt: string,
  userPrompt: string,
  maxTokens?: number
): Promise<string> {
  const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  if (import.meta.env.DEV) {
    console.log('[DramaFlow AI 请求]', {
      model: config.model,
      baseUrl: config.baseUrl,
      system: systemPrompt,
      user: userPrompt,
      temperature: config.temperature ?? 0.7,
      max_tokens: maxTokens ?? config.maxTokens ?? 2048,
    });
  }
  try {
    const data = await requestAIJSON(
      url,
      {
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ] as ChatMessage[],
        temperature: config.temperature ?? 0.7,
        max_tokens: maxTokens ?? config.maxTokens ?? 2048,
      },
      config
    );
    const content = data.choices?.[0]?.message?.content?.trim() ?? '';
    if (import.meta.env.DEV) {
      console.log('[DramaFlow AI 响应]', { model: config.model, content });
    }
    return content;
  } catch (err) {
    const normalized = normalizeError(err);
    if (import.meta.env.DEV) {
      console.log('[DramaFlow AI 错误]', normalized.message);
    }
    throw normalized;
  }
}

/** 模型连通性测试：发一个最小请求验证 Key / Base URL / 模型名 */
export async function testModelConnection(config: AIModelConfig): Promise<{
  ok: boolean;
  latencyMs?: number;
  error?: string;
}> {
  if (!config.apiKey) {
    return { ok: false, error: '未配置 API Key' };
  }
  if (!config.baseUrl) {
    return { ok: false, error: '未配置 Base URL' };
  }
  const isImageOnly =
    config.purposes.includes('image') &&
    !config.purposes.some((p) => CHAT_PURPOSES.includes(p));
  const isTTSOnly =
    config.purposes.includes('dubbing') &&
    !config.purposes.some((p) => CHAT_PURPOSES.includes(p)) &&
    !config.purposes.includes('image');
  const isVideoOnly =
    config.purposes.includes('video') &&
    !config.purposes.some((p) => CHAT_PURPOSES.includes(p)) &&
    !config.purposes.includes('image') &&
    !config.purposes.includes('dubbing');
  const start = Date.now();
  try {
    if (isImageOnly) {
      await requestImage(config, '一张纯色的测试图片', '1024x1024');
    } else if (isTTSOnly) {
      await requestTTS(config, '你好，这是一段配音连通性测试。');
    } else if (isVideoOnly) {
      return await testVideoConnection(config);
    } else {
      await chatCompletion(config, '你是一个连接测试助手。', '请只回复两个字：正常', 4);
    }
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** 文生图统一入口：按模型配置匹配适配器，返回 dataURL */
export async function requestImage(
  config: AIModelConfig,
  prompt: string,
  size = '1024x1024',
  referenceImages?: string[]
): Promise<string> {
  try {
    return await getImageAdapter(config).generate(config, prompt, size, referenceImages);
  } catch (err) {
    const normalized = normalizeError(err);
    if (import.meta.env.DEV) {
      console.log('[DramaFlow AI 图片错误]', normalized.message);
    }
    throw normalized;
  }
}

/** 语音合成统一入口：按模型配置匹配适配器，返回音频 dataURL */
export async function requestTTS(
  config: AIModelConfig,
  text: string,
  opts: { voice?: string; speed?: number; emotion?: string } = {}
): Promise<string> {
  try {
    return await getTTSAdapter(config).synthesize(config, text, opts);
  } catch (err) {
    const normalized = normalizeError(err);
    if (import.meta.env.DEV) {
      console.log('[DramaFlow AI 配音错误]', normalized.message);
    }
    throw normalized;
  }
}

export function createOpenAIService(config: AIModelConfig, purpose: AIModelPurpose): AIService {
  const baseName = `${config.name} (${purpose})`;

  return {
    name: baseName,

    generateScript: async (_params: AIGenerateScriptParams): Promise<string> => {
      return chatCompletion(
        config,
        '你是一位资深短剧编剧，擅长创作节奏紧凑、冲突强烈的短剧剧本。' +
          '你必须严格按照以下结构化格式输出每一幕，不要输出多余的解释：\n' +
          '### 第N幕 ｜ 场景：内景/外景·地点·时间 ｜ 人物：角色A、角色B\n\n' +
          '【场景描述】\n（场景与动作描写）\n\n角色A：（情绪）台词\n角色B：台词',
        `请根据以下要求生成短剧剧本：\n` +
          `提示：${_params.prompt}\n` +
          `题材：${_params.genre || '不限'}\n` +
          `幕数：${_params.sceneCount || '自动'}\n` +
          `上下文：${_params.context || '无'}\n\n` +
          `格式要求：每一幕以「### 第N幕 ｜ 场景：… ｜ 人物：…」开头，正文包含【场景描述】和带角色名的台词行。`
      );
    },

    generateShots: async (_params: AIGenerateShotsParams): Promise<string[]> => {
      const text = await chatCompletion(
        config,
        '你是一位专业分镜师，擅长将剧本转化为具体的镜头语言描述。' +
          '你必须严格按照以下格式每行输出一个镜头，不要输出序号、编号或任何解释：\n' +
          '镜头类型|拍摄角度|时长秒|镜头描述|视频提示词|配乐风格|音效',
        `请根据以下剧本内容，为「${_params.scene}」场景拆分镜头。\n` +
          `每行一个镜头，格式示例：全景|平视|3.5|咖啡馆全景，阳光透过玻璃，林晓端着咖啡走向镜头|镜头缓慢推近林晓，0-3秒她抬头望向门口，3-6秒陈诺推门走入，林晓神情意外|轻钢琴，氛围舒缓|门铃声、脚步声\n` +
          `字段要求：视频提示词写动态画面与运镜，用「0-3秒」「3-6秒」等分段描述动作变化；配乐风格一句话；音效简短列出关键词。\n` +
          `目标镜头数：${_params.sceneCount ?? 6}（按剧情需要可增减，尽量接近）\n\n` +
          `${_params.scriptContent}`
      );
      return text.split('\n').map((line) => line.replace(/^[-\d.\s]+/, '')).filter(Boolean);
    },

    generateDubbing: async (_params: AIDubbingParams): Promise<string> => {
      return requestTTS(config, _params.text, {
        voice: _params.voice ?? _params.character,
        speed: _params.speed,
        emotion: _params.emotion,
      });
    },

    generateCharacter: async (_params: AIGenerateCharacterParams): Promise<string> => {
      const raw = await chatCompletion(
        config,
        '你是一位人物设定专家，擅长为短剧角色创作立体丰满的人设。' +
          '输出请使用简洁的 Markdown 格式：' +
          '「## 角色定位」「## 性格特征」（要点列表）、「## 背景故事」「## 人物弧光」。' +
          '严禁输出开场白（如“好的”“以下是…”）和结尾客套（如“以上就是”“希望有帮助”）以及任何与人物无关的解释。',
        `请为短剧角色「${_params.name}」创作人设。角色定位：${_params.role}。题材：${_params.genre || '现代都市'}。\n` +
          '格式要求：使用 Markdown 标题与列表，直接输出人设正文，不要输出任何开头和结尾的多余内容。'
      );
      return cleanCharacterDescription(raw);
    },

    generateSuggestions: async (_params: AIGenerateSuggestionParams): Promise<string[]> => {
      const text = await chatCompletion(
        config,
        '你是一位短剧创作顾问，擅长给出具体、可执行的改进建议。',
        `请针对以下${_params.type === 'script' ? '剧本' : _params.type === 'character' ? '角色' : '分镜'}内容给出 3-5 条优化建议：\n\n${_params.context}`
      );
      return text.split('\n').map((line) => line.replace(/^[-\d.\s]+/, '')).filter(Boolean);
    },

    polishScript: async (content: string, _instruction?: string): Promise<string> => {
      return chatCompletion(
        config,
        '你是一位资深剧本编辑，擅长优化台词节奏、增强戏剧冲突。',
        `请根据以下要求润色剧本：${_instruction || '优化表达，增强戏剧张力'}\n\n${content}`
      );
    },

    generateImage: async (_params: AIGenerateImageParams): Promise<string> => {
      return requestImage(config, _params.prompt, _params.size, _params.referenceImages);
    },
  };
}
