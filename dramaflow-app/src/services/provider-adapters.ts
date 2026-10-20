import type { AIModelConfig } from '../data/types';
import {
  IMAGE_TIMEOUT_MS,
  normalizeDashScopeBaseUrl,
  downloadToDataURL,
  requestAIJSON,
  requestAIBinary,
} from './ai-http';

export interface ImageAdapter {
  provider: string;
  matches(config: AIModelConfig): boolean;
  generate(
    config: AIModelConfig,
    prompt: string,
    size: string,
    referenceImages?: string[]
  ): Promise<string>;
}

export interface TTSAdapter {
  provider: string;
  matches(config: AIModelConfig): boolean;
  synthesize(
    config: AIModelConfig,
    text: string,
    opts: { voice?: string; speed?: number; emotion?: string }
  ): Promise<string>;
}

/** 情绪 → 配音指令（通义指令控制模型使用） */
function emotionInstruction(emotion: string | undefined): string | undefined {
  switch (emotion) {
    case 'happy':
      return '用开心、轻快的语气朗读';
    case 'sad':
      return '用悲伤、低落的语气朗读，语速稍慢';
    case 'angry':
      return '用愤怒、激动的语气朗读，语速较快';
    case 'surprise':
      return '用惊讶、意外的语气朗读';
    case 'fear':
      return '用紧张、害怕的语气朗读';
    default:
      return undefined; // calm / 未设置：不附加指令
  }
}

/** 把角色声音标签（如「男声-沉稳磁性」）映射为服务商音色 ID */
function mapTTSVoice(voiceLabel: string | undefined, model: string): string {
  const v = voiceLabel ?? '';
  const isMale = /男|male|onyx|echo|fable|ethan/i.test(v);
  if (/qwen-audio|cosyvoice/i.test(model)) return isMale ? 'longanyang' : 'longxiaochun';
  if (/dashscope/i.test(model) || /qwen.*tts/i.test(model)) return isMale ? 'Ethan' : 'Cherry';
  return isMale ? 'onyx' : 'nova';
}

/** 通义万相 Qwen-Image：原生 multimodal-generation 接口 */
const dashscopeImageAdapter: ImageAdapter = {
  provider: 'dashscope',
  matches: (c) => c.provider === 'dashscope' && /^qwen-image/i.test(c.model),
  generate: async (config, prompt, size, referenceImages) => {
    const url = `${normalizeDashScopeBaseUrl(config.baseUrl)}/services/aigc/multimodal-generation/generation`;
    // 参考图（1-3 张）走图生图：content 同时放 {image} 与 {text}，保持角色一致性
    const content: Array<{ image?: string; text?: string }> = [];
    for (const ref of (referenceImages ?? []).slice(0, 3)) {
      content.push({ image: ref });
    }
    content.push({ text: prompt });
    if (import.meta.env.DEV) {
      console.log('[DramaFlow AI 图片请求]', {
        model: config.model,
        baseUrl: config.baseUrl,
        endpoint: url,
        prompt,
        referenceImages: (referenceImages ?? []).length,
        size: size.replace(/x/g, '*'),
        parameters: { prompt_extend: false, n: 1 },
      });
    }
    const data = await requestAIJSON(
      url,
      {
        model: config.model,
        input: {
          messages: [{ role: 'user', content }],
        },
        parameters: {
          prompt_extend: false,
          n: 1,
          size: size.replace(/x/g, '*'),
        },
      },
      config,
      IMAGE_TIMEOUT_MS
    );
    const imageUrl = data.output?.choices?.[0]?.message?.content?.find((c: any) => c.image)?.image;
    if (!imageUrl) {
      throw new Error('图像接口未返回有效数据');
    }
    if (import.meta.env.DEV) {
      console.log('[DramaFlow AI 图片响应]', { model: config.model, imageUrl });
    }
    return await downloadToDataURL(imageUrl);
  },
};

/** OpenAI 兼容 /images/generations：兜底适配器 */
const openaiImageAdapter: ImageAdapter = {
  provider: 'openai-compatible',
  matches: () => true,
  generate: async (config, prompt, size, _referenceImages) => {
    const url = `${config.baseUrl.replace(/\/+$/, '')}/images/generations`;
    if (import.meta.env.DEV) {
      console.log('[DramaFlow AI 图片请求]', { model: config.model, baseUrl: config.baseUrl, prompt, size });
    }
    const data = await requestAIJSON(
      url,
      {
        model: config.model,
        prompt,
        n: 1,
        size: config.provider === 'dashscope' ? size.replace(/x/g, '*') : size,
        response_format: 'b64_json',
      },
      config,
      IMAGE_TIMEOUT_MS
    );
    const item = data.data?.[0];
    if (item?.b64_json) {
      return `data:image/png;base64,${item.b64_json}`;
    }
    if (item?.url) {
      return await downloadToDataURL(item.url);
    }
    throw new Error('图像接口未返回有效数据');
  },
};

/**
 * 通义语音合成：
 * - qwen-audio-3.0-tts-* / cosyvoice-*：专用 SpeechSynthesizer 接口（支持情绪指令）
 * - qwen3-tts / qwen-tts：multimodal-generation 接口
 */
const dashscopeTTSAdapter: TTSAdapter = {
  provider: 'dashscope',
  matches: (c) => c.provider === 'dashscope' && /qwen.*tts|cosyvoice/i.test(c.model),
  synthesize: async (config, text, opts) => {
    const isAudioModel = /qwen-audio|cosyvoice/i.test(config.model);
    const base = normalizeDashScopeBaseUrl(config.baseUrl);
    const url = isAudioModel
      ? `${base}/services/audio/tts/SpeechSynthesizer`
      : `${base}/services/aigc/multimodal-generation/generation`;
    const voice = mapTTSVoice(opts.voice, config.model);
    const instruction = emotionInstruction(opts.emotion);
    if (import.meta.env.DEV) {
      console.log('[DramaFlow AI 配音请求]', {
        model: config.model,
        endpoint: url,
        text,
        voice,
        emotion: opts.emotion,
        instruction,
      });
    }
    const input: Record<string, unknown> = isAudioModel
      ? {
          text,
          voice,
          format: 'wav',
          sample_rate: 24000,
          // 语速：CosyVoice SpeechSynthesizer 的 rate 参数（0.5~2）
          ...((opts.speed ?? 1) !== 1
            ? { rate: Math.min(2, Math.max(0.5, opts.speed!)) }
            : {}),
          ...(instruction ? { instruction } : {}),
        }
      : {
          text,
          voice,
          language_type: 'Chinese',
          ...(/instruct/i.test(config.model) && instruction ? { instructions: instruction } : {}),
        };
    const data = await requestAIJSON(url, { model: config.model, input }, config);
    const audioUrl = data.output?.audio?.url ?? data.output?.url;
    if (!audioUrl) {
      throw new Error('语音接口未返回有效音频');
    }
    if (import.meta.env.DEV) {
      console.log('[DramaFlow AI 配音响应]', { model: config.model, audioUrl });
    }
    return await downloadToDataURL(audioUrl);
  },
};

/** OpenAI 兼容 /audio/speech：兜底适配器 */
const openaiTTSAdapter: TTSAdapter = {
  provider: 'openai-compatible',
  matches: () => true,
  synthesize: async (config, text, opts) => {
    const url = `${config.baseUrl.replace(/\/+$/, '')}/audio/speech`;
    if (import.meta.env.DEV) {
      console.log('[DramaFlow AI 配音请求]', {
        model: config.model,
        endpoint: url,
        text,
        voice: mapTTSVoice(opts.voice, 'openai'),
      });
    }
    const blob = await requestAIBinary(
      url,
      {
        model: config.model,
        input: text,
        voice: mapTTSVoice(opts.voice, 'openai'),
        speed: opts.speed ?? 1.0,
        response_format: 'mp3',
      },
      config
    );
    const buf = await blob.arrayBuffer();
    const mpeg = new Blob([buf], { type: 'audio/mpeg' });
    const reader = new FileReader();
    return await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('音频读取失败'));
      reader.readAsDataURL(mpeg);
    });
  },
};

const imageAdapters: ImageAdapter[] = [dashscopeImageAdapter, openaiImageAdapter];
const ttsAdapters: TTSAdapter[] = [dashscopeTTSAdapter, openaiTTSAdapter];

/** 按配置匹配文生图适配器（找不到回退 OpenAI 兼容） */
export function getImageAdapter(config: AIModelConfig): ImageAdapter {
  return imageAdapters.find((a) => a.matches(config)) ?? openaiImageAdapter;
}

/** 按配置匹配语音合成适配器（找不到回退 OpenAI 兼容） */
export function getTTSAdapter(config: AIModelConfig): TTSAdapter {
  return ttsAdapters.find((a) => a.matches(config)) ?? openaiTTSAdapter;
}
