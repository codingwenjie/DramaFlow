import { generateId, loadModuleData, saveModuleData, saveProjectFile, loadProjectFile } from '../data/storage';
import type { AIModelConfig, Shot, VideoTask } from '../data/types';
import {
  getVideoAdapter,
  isOmniWanModel,
  isT2VVideoModel,
  normalizeDashScopeBaseUrl,
} from './video-providers';

/** 视频生成请求统一走本地代理（开发环境），绕开服务商 CORS 限制 */
function videoFetch(url: string, init: RequestInit): Promise<Response> {
  // 校验并清理请求头：Header 值必须是 ISO-8859-1 可表示字符
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
  if (import.meta.env.DEV) {
    return fetch(`/__dramaflow-ai-proxy?url=${encodeURIComponent(url)}`, init);
  }
  return fetch(url, init);
}

/**
 * 视频模型连接测试：查询一个不存在的任务，验证 API Key / Base URL 是否有效。
 * 通义万相还会额外发一个零成本探测请求，确认模型确实已开通，
 * 避免出现「测试通过但生成时提示模型未开通」的误导。
 */
export async function testVideoConnection(config: AIModelConfig): Promise<{
  ok: boolean;
  latencyMs?: number;
  error?: string;
}> {
  if (!config.apiKey) return { ok: false, error: '未配置 API Key' };
  if (!config.baseUrl) return { ok: false, error: '未配置 Base URL' };
  const start = Date.now();
  try {
    if (config.provider === 'custom') {
      return { ok: false, error: '自定义视频模型不支持自动测试，请直接生成视频验证' };
    }
    const adapter = getVideoAdapter(config.provider);
    if (!adapter.buildTestRequest) {
      return { ok: false, error: '该服务商不支持自动测试，请直接生成视频验证' };
    }
    const req = adapter.buildTestRequest(config);
    const res = await videoFetch(req.url, {
      method: req.method,
      headers: req.headers,
    });
    const body = await res.text().catch(() => '');
    const detail = extractErrorDetail(body);
    if (!res.ok) {
      return { ok: false, error: `连接失败（HTTP ${res.status}）${detail ? `：${detail}` : ''}` };
    }
    if (/AccessDenied|Model\.AccessDenied|Unpurchased|InvalidApiKey/i.test(body)) {
      return { ok: false, error: detail || '服务返回访问拒绝错误，请检查 Key 与模型开通状态' };
    }
    // 通义万相：任务查询只能证明 Key 有效，无法证明模型已开通，补一次零成本探测
    if (config.provider === 'dashscope') {
      const probeError = await probeDashScopeVideoAccess(config);
      if (probeError) return { ok: false, error: probeError };
    }
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** 从服务响应里提取可读错误信息（优先取 message/code） */
function extractErrorDetail(body: string): string {
  if (!body) return '';
  try {
    const j = JSON.parse(body);
    return (
      j?.message ||
      j?.error?.message ||
      (typeof j?.error === 'string' ? j.error : '') ||
      j?.code ||
      ''
    );
  } catch {
    return body.slice(0, 160);
  }
}

/**
 * 零成本模型探测：向通义万相视频合成接口发一个空 prompt 的请求。
 * 若返回权限类错误说明模型未开通；若能创建任务说明权限已通过
 * （任务会因「prompt 为空」在 0.1 秒内失败，失败任务不产生费用），
 * 再立即用 DELETE 取消兜底。避免「测试通过但生成时提示未开通」的误导。
 */
async function probeDashScopeVideoAccess(config: AIModelConfig): Promise<string | null> {
  const base = normalizeDashScopeBaseUrl(config.baseUrl);
  const url = `${base}/services/aigc/video-generation/video-synthesis`;
  try {
    const res = await videoFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
        'X-DashScope-Async': 'enable',
      },
      body: JSON.stringify({
        model: config.model,
        input: { prompt: '' },
        parameters: { duration: 0 },
      }),
    });
    const body = await res.text().catch(() => '');
    if (/AccessDenied|Unpurchased|InvalidApiKey|Forbidden/i.test(body)) {
      const detail = extractErrorDetail(body);
      return `模型未开通或无权调用${detail ? `：${detail}` : ''}`;
    }
    // 安全兜底：万一服务端接受了探测请求并创建了任务，立即取消，避免产生费用
    if (res.ok) {
      try {
        const j = JSON.parse(body);
        if (j?.output?.task_id) {
          await videoFetch(`${base}/tasks/${j.output.task_id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${config.apiKey}` },
          });
        }
      } catch {
        /* 忽略：正常探测不会走到这里 */
      }
    }
    return null; // 到达模型层（权限通过），探测成功
  } catch {
    return null; // 网络抖动等异常不覆盖前面的连接测试结论
  }
}

export function loadVideoTasks(projectId: string): VideoTask[] {
  return loadModuleData<VideoTask[]>(projectId, 'videoTasks', []);
}

function saveVideoTasks(projectId: string, tasks: VideoTask[]): void {
  saveModuleData(projectId, 'videoTasks', tasks);
}

function updateTask(projectId: string, taskId: string, patch: Partial<VideoTask>): void {
  const tasks = loadVideoTasks(projectId).map((t) =>
    t.id === taskId ? { ...t, ...patch, updatedAt: Date.now() } : t
  );
  saveVideoTasks(projectId, tasks);
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('图片读取失败'));
    reader.readAsDataURL(blob);
  });
}

/** 把分镜图转成 dataURL（db:// 从 IndexedDB 读取） */
async function resolveImageDataUrl(projectId: string, ref: string): Promise<string | null> {
  if (ref.startsWith('db://')) {
    const blob = await loadProjectFile(projectId, ref.slice(5)).catch(() => undefined);
    if (!blob) return null;
    return await blobToDataURL(blob);
  }
  if (ref.startsWith('data:')) return ref;
  return null;
}

/**
 * 发起图生视频任务（异步）：创建任务 → 轮询服务商 → 下载视频存本地 → 更新镜头。
 * 任务状态持久化到项目模块数据（videoTasks），刷新后可恢复轮询。
 */
export async function startVideoGeneration(
  projectId: string,
  shot: Shot,
  model: AIModelConfig,
  aspectRatio: string,
  referenceRefs?: string[]
): Promise<VideoTask> {
  const t2v = isT2VVideoModel(model);
  const omni = isOmniWanModel(model);
  if (!t2v && !omni && !shot.img) {
    throw new Error('该镜头还没有分镜图，请先生成图片');
  }
  const task: VideoTask = {
    id: generateId(),
    projectId,
    shotId: shot.id,
    provider: model.provider,
    model: model.model,
    taskId: null,
    status: 'processing',
    prompt: shot.videoPrompt || shot.desc,
    imageUrl: t2v ? '' : shot.img, // 存引用，生成时再解析；全能模型有分镜图则走首帧生视频
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const tasks = loadVideoTasks(projectId);
  saveVideoTasks(projectId, [...tasks, task]);
  void runVideoTask(projectId, task, model, aspectRatio, referenceRefs);
  return task;
}

/** 恢复未完成任务（刷新页面后重新轮询） */
export function resumeVideoTask(
  projectId: string,
  task: VideoTask,
  model: AIModelConfig,
  aspectRatio: string
): void {
  if (task.status === 'processing' || task.status === 'pending') {
    void runVideoTask(projectId, task, model, aspectRatio);
  }
}

async function runVideoTask(
  projectId: string,
  task: VideoTask,
  model: AIModelConfig,
  aspectRatio: string,
  referenceRefs?: string[]
): Promise<void> {
  try {
    const adapter = getVideoAdapter(model.provider);
    if (!task.taskId) {
      let imageUrl: string | null = null;
      if (task.imageUrl) {
        imageUrl = await resolveImageDataUrl(projectId, task.imageUrl);
        if (!imageUrl) {
          throw new Error('该镜头的分镜图已不存在，请重新生成图片后再试');
        }
      }
      const referenceImages: string[] = [];
      for (const ref of referenceRefs ?? []) {
        const dataUrl = await resolveImageDataUrl(projectId, ref).catch(() => null);
        if (dataUrl) referenceImages.push(dataUrl);
      }
      const req = adapter.buildGenerateRequest(model, {
        prompt: task.prompt,
        imageUrl: imageUrl ?? undefined,
        referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
        duration: 5,
        aspectRatio,
      });
      const res = await videoFetch(req.url, {
        method: req.method,
        headers: req.headers,
        body: req.method === 'GET' ? undefined : JSON.stringify(req.body),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        if (/AccessDenied\.Unpurchased/i.test(body)) {
          throw new Error(
            '该视频模型尚未在当前账号开通（AccessDenied.Unpurchased），请到百炼控制台「模型广场」申请开通该模型后重试'
          );
        }
        throw new Error(`视频任务创建失败（HTTP ${res.status}）${body ? `：${body.slice(0, 120)}` : ''}`);
      }
      const json = await res.json();
      const parsed = adapter.parseGenerateResponse(json);
      if (parsed.error) throw new Error(parsed.error);
      if (!parsed.isAsync && parsed.videoUrl) {
        await saveVideoResult(projectId, task, parsed.videoUrl);
        return;
      }
      if (!parsed.taskId) throw new Error('服务商未返回任务 ID');
      updateTask(projectId, task.id, { taskId: parsed.taskId, status: 'processing' });
    }
    await pollUntilDone(projectId, task.id, model);
  } catch (err) {
    updateTask(projectId, task.id, {
      status: 'failed',
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function pollUntilDone(projectId: string, taskId: string, model: AIModelConfig): Promise<void> {
  const adapter = getVideoAdapter(model.provider);
  const maxRounds = 120;
  for (let i = 0; i < maxRounds; i++) {
    await new Promise((r) => setTimeout(r, 8000));
    const task = loadVideoTasks(projectId).find((t) => t.id === taskId);
    if (!task?.taskId) return;
    try {
      const req = adapter.buildPollRequest(model, task.taskId);
      const res = await videoFetch(req.url, { method: req.method, headers: req.headers });
      if (!res.ok) {
        updateTask(projectId, taskId, { status: 'failed', error: `任务查询失败（HTTP ${res.status}）` });
        return;
      }
      const json = await res.json();
      const parsed = adapter.parsePollResponse(json);
      if (parsed.status === 'completed' && parsed.videoUrl) {
        await saveVideoResult(projectId, task, parsed.videoUrl);
        return;
      }
      if (parsed.status === 'failed') {
        updateTask(projectId, taskId, { status: 'failed', error: parsed.error || '视频生成失败' });
        return;
      }
      updateTask(projectId, taskId, { status: 'processing' });
    } catch {
      // 网络抖动：继续下一轮轮询
    }
  }
  updateTask(projectId, taskId, { status: 'failed', error: '视频生成超时，请稍后重试' });
}

async function saveVideoResult(projectId: string, task: VideoTask, videoUrl: string): Promise<void> {
  const res = await videoFetch(videoUrl, {});
  if (!res.ok) throw new Error(`视频下载失败（HTTP ${res.status}）`);
  const blob = await res.blob();
  const fileId = `video-${task.shotId}`;
  await saveProjectFile(projectId, fileId, blob);
  const tasks = loadVideoTasks(projectId).map((t) =>
    t.id === task.id
      ? { ...t, status: 'completed' as const, videoUrl: `db://${fileId}`, updatedAt: Date.now() }
      : t
  );
  saveVideoTasks(projectId, tasks);
}
