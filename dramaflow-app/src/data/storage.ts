import { Project, Episode, Character, Shot, DubbingLine, SynthesisConfig } from './types';

const STORAGE_KEY = 'dramaflow-data';

export function saveProjects(projects: Project[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (e) {
    console.error('Failed to save projects:', e);
  }
}

export function loadProjects(): Project[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load projects:', e);
    return [];
  }
}

export function saveAppState(state: {
  activeView: string;
  activeProjectId: string | null;
  activeTab: string;
}): void {
  try {
    localStorage.setItem('dramaflow-app-state', JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save app state:', e);
  }
}

export function loadAppState(): {
  activeView: string;
  activeProjectId: string | null;
  activeTab: string;
} | null {
  try {
    const data = localStorage.getItem('dramaflow-app-state');
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('Failed to load app state:', e);
    return null;
  }
}

export function generateId(): string {
  return 'p' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

export function generateModuleId(prefix: string): string {
  return prefix + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
}

// Module-level data storage (per-project, per-module)
type ModuleData = Episode[] | Character[] | Shot[] | DubbingLine[] | SynthesisConfig;

function moduleKey(projectId: string, module: string): string {
  return `dramaflow-module-${projectId}-${module}`;
}

export function saveModuleData(projectId: string, module: string, data: ModuleData): void {
  try {
    localStorage.setItem(moduleKey(projectId, module), JSON.stringify(data));
  } catch (e) {
    console.error(`Failed to save module data ${module} for project ${projectId}:`, e);
  }
}

export function loadModuleData<T = ModuleData>(projectId: string, module: string, fallback: T): T {
  try {
    const data = localStorage.getItem(moduleKey(projectId, module));
    if (data) {
      return JSON.parse(data) as T;
    }
    // Initialize with fallback data
    saveModuleData(projectId, module, fallback as ModuleData);
    return fallback;
  } catch (e) {
    console.error(`Failed to load module data ${module} for project ${projectId}:`, e);
    return fallback;
  }
}

export function clearModuleData(projectId: string, module: string): void {
  try {
    localStorage.removeItem(moduleKey(projectId, module));
  } catch (e) {
    console.error(`Failed to clear module data ${module} for project ${projectId}:`, e);
  }
}

export function clearAllProjectData(projectId: string): void {
  const modules = ['episodes', 'characters', 'shots', 'dubbing', 'synthesis'];
  modules.forEach((m) => clearModuleData(projectId, m));
}