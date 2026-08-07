import { generateId, loadModuleData, saveModuleData, saveProjectFile, loadProjectFile } from '../data/storage';
import type { AIModelConfig, Shot, VideoTask } from '../data/types';
import { getVideoAdapter } from './video-providers';

/** 视频生成请求统一走本地代理（开发环境），绕开服务商 CORS 限制 */
function videoFetch(url: string, init: RequestInit): Promise<Response> {
  if (import.meta.env.DEV) {
    return fetch(`/__dramaflow-ai-proxy?url=${encodeURIComponent(url)}`, init);
  }
  return fetch(url, init);
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
  if (!shot.img) {
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
    imageUrl: shot.img, // 存引用，生成时再解析，避免大图写进 localStorage
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
      const imageUrl = await resolveImageDataUrl(projectId, task.imageUrl);
      if (!imageUrl) {
        throw new Error('该镜头的分镜图已不存在，请重新生成图片后再试');
      }
      const referenceImages: string[] = [];
      for (const ref of referenceRefs ?? []) {
        const dataUrl = await resolveImageDataUrl(projectId, ref).catch(() => null);
        if (dataUrl) referenceImages.push(dataUrl);
      }
      const req = adapter.buildGenerateRequest(model, {
        prompt: task.prompt,
        imageUrl,
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
