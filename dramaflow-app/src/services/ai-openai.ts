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

interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

export const REQUEST_TIMEOUT_MS = 60_000;
const IMAGE_TIMEOUT_MS = 120_000;

/** 统一错误消息：按 HTTP 状态码映射为可读的中文提示 */
function mapHttpError(status: number): string {
  switch (status) {
    case 400:
      return '请求参数错误，请检查模型名（model）是否被服务商支持';
    case 401:
    case 403:
      return 'API Key 无效或无权限，请检查模型配置';
    case 404:
      return '接口地址不存在，请检查 Base URL 是否填写正确';
    case 429:
      return '请求过于频繁或额度不足，请稍后重试';
    case 500:
    case 502:
    case 503:
      return '模型服务暂时不可用，请稍后重试';
    default:
      return `请求失败（HTTP ${status}）`;
  }
}

function normalizeError(err: unknown): Error {
  if (err instanceof Error) {
    if (err.name === 'AbortError') {
      return new Error('请求超时（60 秒），请检查网络或稍后重试');
    }
    if (/Failed to fetch|NetworkError|fetch failed/i.test(err.message)) {
      return new Error('网络连接失败，请检查网络或 API 地址');
    }
    return err;
  }
  return new Error(String(err));
}

/** 核心 Chat Completions 调用：带超时与统一错误处理 */
async function chatCompletion(
  config: AIModelConfig,
  systemPrompt: string,
  userPrompt: string,
  maxTokens?: number
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
    // 开发调试日志：打印请求入参（不包含 API Key）
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
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ] as ChatMessage[],
        temperature: config.temperature ?? 0.7,
        max_tokens: maxTokens ?? config.maxTokens ?? 2048,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const detail = res.status === 404 ? `\n实际请求地址：${url}` : body ? `（${body.slice(0, 120)}）` : '';
      if (import.meta.env.DEV) {
        console.log('[DramaFlow AI 错误]', `${mapHttpError(res.status)}${detail}`);
      }
      throw new Error(`${mapHttpError(res.status)}${detail}`);
    }
    const data = (await res.json()) as { choices: { message: { content: string } }[] };
    const content = data.choices[0]?.message?.content?.trim() ?? '';
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
  } finally {
    clearTimeout(timer);
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
  const start = Date.now();
  try {
    await chatCompletion(config, '你是一个连接测试助手。', '请只回复两个字：正常', 4);
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** 文生图（OpenAI 兼容 /images/generations）：返回 dataURL */
export async function requestImage(
  config: AIModelConfig,
  prompt: string,
  size = '1024x1024'
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
  try {
    const url = `${config.baseUrl.replace(/\/+$/, '')}/images/generations`;
    if (import.meta.env.DEV) {
      console.log('[DramaFlow AI 图片请求]', { model: config.model, baseUrl: config.baseUrl, prompt, size });
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        prompt,
        n: 1,
        size,
        response_format: 'b64_json',
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const detail = res.status === 404 ? `\n实际请求地址：${url}` : body ? `（${body.slice(0, 120)}）` : '';
      throw new Error(`${mapHttpError(res.status)}${detail}`);
    }
    const data = (await res.json()) as { data?: { b64_json?: string; url?: string }[] };
    const item = data.data?.[0];
    if (item?.b64_json) {
      return `data:image/png;base64,${item.b64_json}`;
    }
    if (item?.url) {
      const imgRes = await fetch(item.url);
      const blob = await imgRes.blob();
      return await blobToDataURL(blob);
    }
    throw new Error('图像接口未返回有效数据');
  } catch (err) {
    const normalized = normalizeError(err);
    if (import.meta.env.DEV) {
      console.log('[DramaFlow AI 图片错误]', normalized.message);
    }
    throw normalized;
  } finally {
    clearTimeout(timer);
  }
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('图片读取失败'));
    reader.readAsDataURL(blob);
  });
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
          '镜头类型|拍摄角度|时长秒|镜头描述',
        `请根据以下剧本内容，为「${_params.scene}」场景拆分镜头。\n` +
          `每行一个镜头，格式示例：全景|平视|3.5|咖啡馆全景，阳光透过玻璃，林晓端着咖啡走向镜头\n` +
          `目标镜头数：${_params.sceneCount ?? 6}（按剧情需要可增减，尽量接近）\n\n` +
          `${_params.scriptContent}`
      );
      return text.split('\n').map((line) => line.replace(/^[-\d.\s]+/, '')).filter(Boolean);
    },

    generateDubbing: async (_params: AIDubbingParams): Promise<string> => {
      // OpenAI 本身没有 TTS 的直接音频 URL 返回，这里返回占位符
      // 实际接入时应调用 /audio/speech 并返回 blob URL
      return 'openai-tts-mock-url';
    },

    generateCharacter: async (_params: AIGenerateCharacterParams): Promise<string> => {
      return chatCompletion(config,
        '你是一位人物设定专家，擅长为短剧角色创作立体丰满的人设。',
        `请为短剧角色「${_params.name}」创作人设。角色定位：${_params.role}。题材：${_params.genre || '现代都市'}。`
      );
    },

    generateSuggestions: async (_params: AIGenerateSuggestionParams): Promise<string[]> => {
      const text = await chatCompletion(config,
        '你是一位短剧创作顾问，擅长给出具体、可执行的改进建议。',
        `请针对以下${_params.type === 'script' ? '剧本' : _params.type === 'character' ? '角色' : '分镜'}内容给出 3-5 条优化建议：\n\n${_params.context}`
      );
      return text.split('\n').map((line) => line.replace(/^[-\d.\s]+/, '')).filter(Boolean);
    },

    polishScript: async (content: string, _instruction?: string): Promise<string> => {
      return chatCompletion(config,
        '你是一位资深剧本编辑，擅长优化台词节奏、增强戏剧冲突。',
        `请根据以下要求润色剧本：${_instruction || '优化表达，增强戏剧张力'}\n\n${content}`
      );
    },

    generateImage: async (_params: AIGenerateImageParams): Promise<string> => {
      return requestImage(config, _params.prompt, _params.size);
    },
  };
}
