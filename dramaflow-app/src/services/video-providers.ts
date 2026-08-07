import type { AIModelConfig } from '../data/types';

export interface VideoGenParams {
  prompt: string;
  /** 参考图：dataURL（本地图）或 http(s) URL */
  imageUrl: string;
  /** 角色参考图（多参考图厂商使用，dataURL） */
  referenceImages?: string[];
  duration?: number;
  aspectRatio?: string;
}

export interface ProviderRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

export interface VideoProviderAdapter {
  provider: string;
  buildGenerateRequest(config: AIModelConfig, params: VideoGenParams): ProviderRequest;
  parseGenerateResponse(json: any): {
    isAsync: boolean;
    taskId?: string;
    videoUrl?: string;
    error?: string;
  };
  buildPollRequest(config: AIModelConfig, taskId: string): ProviderRequest;
  parsePollResponse(json: any): {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    videoUrl?: string;
    error?: string;
  };
}

/** 可灵 Kling：图生视频（异步任务，轮询任务状态） */
class KlingVideoAdapter implements VideoProviderAdapter {
  provider = 'kling';

  buildGenerateRequest(config: AIModelConfig, params: VideoGenParams): ProviderRequest {
    const url = `${config.baseUrl.replace(/\/+$/, '')}/v1/videos/image2video`;
    return {
      url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: {
        model_name: config.model || 'kling-v1-6',
        image: params.imageUrl,
        prompt: params.prompt,
        duration: String(params.duration ?? 5),
        aspect_ratio: params.aspectRatio || '9:16',
      },
    };
  }

  parseGenerateResponse(json: any) {
    if (json.code !== 0) {
      return { isAsync: false, error: json.message || '可灵接口返回错误' };
    }
    if (json.data?.task_id) {
      return { isAsync: true, taskId: json.data.task_id };
    }
    const videoUrl = json.data?.task_result?.videos?.[0]?.url;
    if (videoUrl) return { isAsync: false, videoUrl };
    return { isAsync: false, error: '可灵接口未返回任务 ID' };
  }

  buildPollRequest(config: AIModelConfig, taskId: string): ProviderRequest {
    return {
      url: `${config.baseUrl.replace(/\/+$/, '')}/v1/videos/image2video/${taskId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${config.apiKey}` },
      body: undefined,
    };
  }

  parsePollResponse(json: any) {
    if (json.code !== 0) {
      return { status: 'failed' as const, error: json.message || '可灵任务查询失败' };
    }
    const status = json.data?.task_status;
    if (status === 'succeed') {
      return { status: 'completed' as const, videoUrl: json.data?.task_result?.videos?.[0]?.url };
    }
    if (status === 'failed') {
      return { status: 'failed' as const, error: json.data?.task_status_msg || '可灵任务失败' };
    }
    return { status: 'processing' as const };
  }
}

/** 火山引擎 Seedance：图生视频（异步任务，轮询任务状态） */
class VolcengineVideoAdapter implements VideoProviderAdapter {
  provider = 'volcengine';

  buildGenerateRequest(config: AIModelConfig, params: VideoGenParams): ProviderRequest {
    const url = `${config.baseUrl.replace(/\/+$/, '')}/contents/generations/tasks`;
    return {
      url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: {
        model: config.model || 'doubao-seedance-1-5-pro-251215',
        content: [
          { type: 'text', text: params.prompt },
          { type: 'image_url', image_url: { url: params.imageUrl } },
          ...(params.referenceImages ?? []).map((ref) => ({
            type: 'image_url' as const,
            image_url: { url: ref },
          })),
        ],
        generate_audio: true,
        ratio: params.aspectRatio || '9:16',
        duration: params.duration ?? 5,
        watermark: false,
      },
    };
  }

  parseGenerateResponse(json: any) {
    if (json.id) {
      return { isAsync: true, taskId: json.id };
    }
    const videoUrl = json.video_url || json.content?.video_url || json.data?.video_url;
    if (videoUrl) return { isAsync: false, videoUrl };
    return { isAsync: false, error: json.error?.message || '火山接口未返回任务 ID' };
  }

  buildPollRequest(config: AIModelConfig, taskId: string): ProviderRequest {
    return {
      url: `${config.baseUrl.replace(/\/+$/, '')}/contents/generations/tasks/${taskId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${config.apiKey}` },
      body: undefined,
    };
  }

  parsePollResponse(json: any) {
    const status = json.status;
    if (status === 'succeeded') {
      return {
        status: 'completed' as const,
        videoUrl: json.content?.video_url || json.video_url || json.data?.video_url,
      };
    }
    if (status === 'failed' || status === 'cancelled') {
      return { status: 'failed' as const, error: json.error?.message || '火山任务失败' };
    }
    return { status: 'processing' as const };
  }
}

/** 通义万相 Wan：基于首帧生成视频（异步任务，轮询任务状态） */
class DashScopeWanVideoAdapter implements VideoProviderAdapter {
  provider = 'dashscope';

  buildGenerateRequest(config: AIModelConfig, params: VideoGenParams): ProviderRequest {
    const base = normalizeDashScopeBaseUrl(config.baseUrl);
    return {
      url: `${base}/services/aigc/video-generation/video-synthesis`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
        'X-DashScope-Async': 'enable',
      },
      body: {
        model: config.model || 'wanx2.1-i2v-turbo',
        input: {
          prompt: params.prompt,
          img_url: params.imageUrl,
        },
        parameters: {
          n: 1,
          duration: params.duration ?? 5,
        },
      },
    };
  }

  parseGenerateResponse(json: any) {
    if (json.output?.task_id) {
      return { isAsync: true, taskId: json.output.task_id };
    }
    if (json.output?.video_url) {
      return { isAsync: false, videoUrl: json.output.video_url };
    }
    return { isAsync: false, error: json.message || '通义万相接口未返回任务 ID' };
  }

  buildPollRequest(config: AIModelConfig, taskId: string): ProviderRequest {
    const base = normalizeDashScopeBaseUrl(config.baseUrl);
    return {
      url: `${base}/tasks/${taskId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${config.apiKey}` },
      body: undefined,
    };
  }

  parsePollResponse(json: any) {
    const status = json.output?.task_status;
    if (status === 'SUCCEEDED') {
      return { status: 'completed' as const, videoUrl: json.output?.video_url };
    }
    if (status === 'FAILED' || status === 'CANCELED') {
      return { status: 'failed' as const, error: json.output?.message || '通义万相任务失败' };
    }
    return { status: 'processing' as const };
  }
}

function normalizeDashScopeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, '');
  if (/\/compatible-mode\/v1$/i.test(trimmed)) {
    return trimmed.replace(/\/compatible-mode\/v1$/i, '/api/v1');
  }
  if (/\/v1$/i.test(trimmed)) {
    return trimmed.replace(/\/v1$/i, '/api/v1');
  }
  return trimmed;
}

export function getVideoAdapter(provider: string): VideoProviderAdapter {
  switch (provider) {
    case 'kling':
      return new KlingVideoAdapter();
    case 'volcengine':
      return new VolcengineVideoAdapter();
    case 'dashscope':
      return new DashScopeWanVideoAdapter();
    default:
      throw new Error(`不支持的视频服务商：${provider}`);
  }
}
