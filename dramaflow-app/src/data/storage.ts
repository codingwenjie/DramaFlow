import { Project, Episode, Character, Shot, DubbingLine, SynthesisConfig } from './types';
import { dbGet, dbSet, dbDelete, dbAllKeys, dbSaveFile, dbLoadFile, dbDeleteFile, dbDeleteFilesByPrefix } from './db';

const STORAGE_KEY = 'dramaflow-data';

// ===== 双写工具：localStorage（同步缓存）+ IndexedDB（持久化） =====
function localGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function localSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.error(`Failed to save to localStorage (${key}):`, e);
  }
}

function localRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/** 同步读（localStorage 缓存），IndexedDB 不可用时也能工作 */
function syncGet(key: string): string | null {
  return localGet(key);
}

/** 写：localStorage 同步 + IndexedDB 异步双写 */
function syncSet(key: string, value: string): void {
  localSet(key, value);
  dbSet(key, value).catch((e) => console.error(`Failed to persist to IndexedDB (${key}):`, e));
}

function syncRemove(key: string): void {
  localRemove(key);
  dbDelete(key).catch((e) => console.error(`Failed to delete from IndexedDB (${key}):`, e));
}

/**
 * 启动时恢复：把 IndexedDB 中的数据同步回 localStorage 缓存，
 * 并把 localStorage 中尚未持久化的旧数据迁移进 IndexedDB。
 */
export async function initStorage(): Promise<void> {
  try {
    const keys = await dbAllKeys();
    for (const key of keys) {
      const value = await dbGet(key);
      if (value != null) localSet(key, value);
    }
    const seen = new Set(keys);
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !seen.has(key)) {
        const value = localStorage.getItem(key);
        if (value != null) {
          await dbSet(key, value);
          seen.add(key);
        }
      }
    }
  } catch (e) {
    console.error('IndexedDB 恢复失败，继续使用 localStorage：', e);
  }
}

// ===== 项目列表 =====
export function saveProjects(projects: Project[]): void {
  syncSet(STORAGE_KEY, JSON.stringify(projects));
}

export function loadProjects(): Project[] {
  const data = syncGet(STORAGE_KEY);
  if (!data) return [];
  try {
    const parsed = JSON.parse(data) as Project[];
    // 防御：按 id 去重（旧版本 addProject 曾导致重复写入同一项目）
    const seen = new Set<string>();
    return parsed.filter((p) => {
      if (!p?.id || seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  } catch (e) {
    console.error('Failed to load projects:', e);
    return [];
  }
}

// ===== 应用状态 =====
export function saveAppState(state: {
  activeView: string;
  activeProjectId: string | null;
  activeTab: string;
}): void {
  syncSet('dramaflow-app-state', JSON.stringify(state));
}

export function loadAppState(): {
  activeView: string;
  activeProjectId: string | null;
  activeTab: string;
} | null {
  const data = syncGet('dramaflow-app-state');
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// ===== ID 生成 =====
export function generateId(): string {
  return 'p' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

export function generateModuleId(prefix: string): string {
  return prefix + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
}

// ===== 模块数据（按项目隔离） =====
type ModuleData = Episode[] | Character[] | Shot[] | DubbingLine[] | SynthesisConfig;

function moduleKey(projectId: string, module: string): string {
  return `dramaflow-module-${projectId}-${module}`;
}

export function saveModuleData(projectId: string, module: string, data: ModuleData): void {
  syncSet(moduleKey(projectId, module), JSON.stringify(data));
}

export function loadModuleData<T = ModuleData>(projectId: string, module: string, fallback: T): T {
  const data = syncGet(moduleKey(projectId, module));
  if (data) {
    try {
      return JSON.parse(data) as T;
    } catch (e) {
      console.error(`Failed to load module data ${module} for project ${projectId}:`, e);
      return fallback;
    }
  }
  // Initialize with fallback data
  saveModuleData(projectId, module, fallback as ModuleData);
  return fallback;
}

export function clearModuleData(projectId: string, module: string): void {
  syncRemove(moduleKey(projectId, module));
}

export function clearAllProjectData(projectId: string): void {
  const modules = ['episodes', 'characters', 'shots', 'dubbing', 'synthesis'];
  modules.forEach((m) => clearModuleData(projectId, m));
  deleteProjectFiles(projectId);
}

// ===== 文件存储（分镜图/音频，IndexedDB） =====
export function projectFileKey(projectId: string, fileId: string): string {
  return `project:${projectId}:${fileId}`;
}

export function saveProjectFile(projectId: string, fileId: string, blob: Blob): Promise<void> {
  return dbSaveFile(projectFileKey(projectId, fileId), blob);
}

export function loadProjectFile(projectId: string, fileId: string): Promise<Blob | undefined> {
  return dbLoadFile(projectFileKey(projectId, fileId));
}

export function deleteProjectFile(projectId: string, fileId: string): Promise<void> {
  return dbDeleteFile(projectFileKey(projectId, fileId));
}

export function deleteProjectFiles(projectId: string): Promise<void> {
  return dbDeleteFilesByPrefix(`project:${projectId}:`);
}
