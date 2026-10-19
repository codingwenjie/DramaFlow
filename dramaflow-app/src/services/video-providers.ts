import type { AIModelConfig } from '../data/types';

export interface VideoGenParams {
  prompt: string;
  /** 参考图：dataURL（本地图）或 http(s) URL；文生视频模型可不传 */
  imageUrl?: string;
  /** 角色参考图（多参考图厂商使用，dataURL） */
  referenceImages?: string[];
  duration?: number;
  aspectRatio?: string;
}

/** 是否为文生视频（t2v）模型：通义万相 t2v 系列不需要分镜图作为输入 */
export function isT2VVideoModel(model: { provider: string; model?: string }): boolean {
  return model.provider === 'dashscope' && /t2v/i.test(model.model ?? '');
}

/** 是否为万相全能视频模型（wan3.0-video）：支持文生视频，也支持首帧/参考生视频 */
export function isOmniWanModel(model: { provider: string; model?: string }): boolean {
  return model.provider === 'dashscope' && /wan3\.0/i.test(model.model ?? '');
}

/** 新一代 dashscope 视频统一格式（media.first_frame + resolution/duration）：wan3.0、happyhorse 等 */
export function isNewDashScopeVideoFormat(model: { provider: string; model?: string }): boolean {
  return model.provider === 'dashscope' && /wan3\.0|happyhorse/i.test(model.model ?? '');
}

/** 该模型是否允许纯文本（无分镜图）生成视频 */
export function supportsTextOnlyVideo(model: { provider: string; model?: string }): boolean {
  return isT2VVideoModel(model) || isOmniWanModel(model);
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
  /** 连接测试请求：查询一个不存在的任务，验证 Key/Base URL 是否有效（不实际创建任务） */
  buildTestRequest?(config: AIModelConfig): ProviderRequest;
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
    if (!params.imageUrl) {
      throw new Error('可灵图生视频需要分镜图作为输入');
    }
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

  buildTestRequest(config: AIModelConfig): ProviderRequest {
    return this.buildPollRequest(config, '__connection_test__');
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
    if (!params.imageUrl) {
      throw new Error('火山 Seedance 图生视频需要分镜图作为输入');
    }
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

  buildTestRequest(config: AIModelConfig): ProviderRequest {
    return this.buildPollRequest(config, '__connection_test__');
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

/** 通义万相 Wan：图生视频（i2v）与文生视频（t2v），均异步任务轮询 */
class DashScopeWanVideoAdapter implements VideoProviderAdapter {
  provider = 'dashscope';

  buildGenerateRequest(config: AIModelConfig, params: VideoGenParams): ProviderRequest {
    const base = normalizeDashScopeBaseUrl(config.baseUrl);
    const url = `${base}/services/aigc/video-generation/video-synthesis`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
      'X-DashScope-Async': 'enable',
    };
    const model = config.model || 'wanx2.1-i2v-turbo';

    // 新一代万相/happyhorse 统一格式：带分镜图走首帧生视频（media.first_frame），无图走纯文生视频
    if (isNewDashScopeVideoFormat(config)) {
      const isWan3 = /wan3\.0/i.test(model);
      const isT2v = /t2v/i.test(model);
      const isR2V = /r2v/i.test(model);
      const needImage = !isWan3 && !isT2v;
      if (needImage && !params.imageUrl && !(params.referenceImages?.length)) {
        throw new Error('该模型需要分镜图作为输入');
      }
      // r2v（参考生视频）要求媒体类型为 reference_image；i2v/wan3.0 用 first_frame 首帧
      const mediaType = isR2V ? 'reference_image' : 'first_frame';
      const media: Array<{ type: string; url: string }> = [];
      if (params.imageUrl) {
        media.push({ type: mediaType, url: params.imageUrl });
      }
      // r2v 额外携带角色参考图（提升角色一致性）；i2v 首帧与参考图类型互斥，不混用
      if (isR2V) {
        for (const ref of params.referenceImages ?? []) {
          media.push({ type: 'reference_image', url: ref });
        }
      }
      const input: Record<string, unknown> = { prompt: params.prompt };
      if (media.length) input.media = media;
      const parameters: Record<string, unknown> = {
        resolution: '720P',
        ...(isWan3 || isT2v
          ? { ratio: params.aspectRatio || (isWan3 ? 'adaptive' : '16:9') }
          : {}),
        ...(isWan3 ? { prompt_extend: true, watermark: false } : {}),
        duration: params.duration ?? 5,
      };
      return {
        url,
        method: 'POST',
        headers,
        body: {
          model,
          input,
          parameters,
        },
      };
    }

    // 文生视频（wan2.7-t2v 系列）：纯文本输入，不带 img_url
    if (isT2VVideoModel(config)) {
      return {
        url,
        method: 'POST',
        headers,
        body: {
          model: config.model || 'wan2.7-t2v-2026-06-12',
          input: {
            prompt: params.prompt,
          },
          parameters: {
            resolution: '720P',
            ratio: params.aspectRatio || '16:9',
            prompt_extend: true,
            watermark: false,
            duration: params.duration ?? 5,
          },
        },
      };
    }

    if (!params.imageUrl) {
      throw new Error('通义万相图生视频需要分镜图作为输入');
    }
    return {
      url: `${base}/services/aigc/video-generation/video-synthesis`,
      method: 'POST',
      headers,
      body: {
        model,
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

  buildTestRequest(config: AIModelConfig): ProviderRequest {
    return this.buildPollRequest(config, '__connection_test__');
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

export function normalizeDashScopeBaseUrl(baseUrl: string): string {
  let trimmed = baseUrl.replace(/\/+$/, '');
  // 兼容用户直接粘贴完整接口地址（含 /services/aigc/video-generation/video-synthesis 尾巴）
  trimmed = trimmed.replace(/\/services\/aigc\/video-generation\/video-synthesis$/i, '');
  if (/\/compatible-mode\/v1$/i.test(trimmed)) {
    return trimmed.replace(/\/compatible-mode\/v1$/i, '/api/v1');
  }
  if (/\/api\/v1$/i.test(trimmed)) {
    return trimmed; // 已是 DashScope 原生地址，保持原样，避免重复拼成 /api/api/v1
  }
  if (/\/v1$/i.test(trimmed)) {
    return trimmed.replace(/\/v1$/i, '/api/v1');
  }
  // 裸域名等未带版本路径的输入，统一补全 DashScope 原生 API 前缀
  return `${trimmed}/api/v1`;
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
