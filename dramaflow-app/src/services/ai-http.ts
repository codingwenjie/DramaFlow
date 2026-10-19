import type { AIModelConfig } from '../data/types';

export const REQUEST_TIMEOUT_MS = 60_000;
export const IMAGE_TIMEOUT_MS = 120_000;

/** 统一错误消息：按 HTTP 状态码映射为可读的中文提示 */
export function mapHttpError(status: number): string {
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

export function normalizeError(err: unknown): Error {
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

/**
 * AI 请求统一出口：
 * 只有必须走代理的场景才走 Vite 本地代理，其余请求保持浏览器直连：
 * - 阿里云百炼原生接口（文生图/语音合成）与结果下载（OSS）不返回 CORS 放行头，
 *   开发环境通过 /__dramaflow-ai-proxy 转发绕开跨域限制
 * - 聊天等其它请求继续直连服务商
 * - 生产环境暂不支持代理，需另行部署服务端转发
 */
export function fetchAI(url: string, init: RequestInit): Promise<Response> {
  // 校验并清理请求头：Header 值必须是 ISO-8859-1 可表示字符，
  // API Key 出现中文/Emoji/全角符号时给出明确提示，而不是抛晦涩的 fetch 异常
  if (init.headers) {
    const headers = init.headers as Record<string, string>;
    for (const key of Object.keys(headers)) {
      const value = String(headers[key] ?? '').trim();
      if (/[^\x00-\xFF]/.test(value)) {
        throw new Error('请求头包含非 ASCII 字符（通常是 API Key 粘贴错误），请检查模型配置');
      }
      headers[key] = value;
    }
  }
  const isDashScopeNative =
    url.includes('/services/aigc/') ||
    url.includes('/services/audio/') ||
    /dashscope-result|oss-accelerate|\.oss-/.test(url);
  if (import.meta.env.DEV && isDashScopeNative) {
    return fetch(`/__dramaflow-ai-proxy?url=${encodeURIComponent(url)}`, init);
  }
  return fetch(url, init);
}

export function normalizeDashScopeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, '');
  if (/\/compatible-mode\/v1$/i.test(trimmed)) {
    return trimmed.replace(/\/compatible-mode\/v1$/i, '/api/v1');
  }
  if (/\/v1$/i.test(trimmed)) {
    return trimmed.replace(/\/v1$/i, '/api/v1');
  }
  return trimmed;
}

export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(blob);
  });
}

/** 把 dataURL 转回 Blob（用 atob 解析，避免 fetch(data:) 在不同内核下的兼容性问题） */
export function dataURLToBlob(dataUrl: string): Blob {
  const [meta, base64] = dataUrl.split(',');
  const mime = /^data:([^;]+);/.exec(meta)?.[1] ?? 'application/octet-stream';
  const binary = atob(base64 ?? '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** 下载资源（图片/音频）并转成 dataURL（走 fetchAI 的代理规则） */
export async function downloadToDataURL(url: string): Promise<string> {
  const res = await fetchAI(url, {});
  if (!res.ok) {
    throw new Error(`资源下载失败（HTTP ${res.status}）`);
  }
  const blob = await res.blob();
  return await blobToDataURL(blob);
}

/** 带超时与统一错误处理的 JSON POST 请求 */
export async function requestAIJSON(
  url: string,
  body: unknown,
  config: AIModelConfig,
  timeoutMs = REQUEST_TIMEOUT_MS,
  extraHeaders: Record<string, string> = {}
): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchAI(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
        ...extraHeaders,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const detail = res.status === 404 ? `\n实际请求地址：${url}` : text ? `（${text.slice(0, 120)}）` : '';
      throw new Error(`${mapHttpError(res.status)}${detail}`);
    }
    return await res.json();
  } catch (err) {
    throw normalizeError(err);
  } finally {
    clearTimeout(timer);
  }
}

/** 带超时与统一错误处理的音频 POST 请求（返回 Blob，如 /audio/speech） */
export async function requestAIBinary(
  url: string,
  body: unknown,
  config: AIModelConfig,
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<Blob> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchAI(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const detail = res.status === 404 ? `\n实际请求地址：${url}` : text ? `（${text.slice(0, 120)}）` : '';
      throw new Error(`${mapHttpError(res.status)}${detail}`);
    }
    return await res.blob();
  } catch (err) {
    throw normalizeError(err);
  } finally {
    clearTimeout(timer);
  }
}
