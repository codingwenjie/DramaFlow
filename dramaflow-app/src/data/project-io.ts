import { generateId, loadModuleData, loadProjects } from './storage';
import type { Character, DubbingLine, Episode, Project, Shot, SynthesisConfig } from './types';

export interface ProjectBundle {
  format: 'dramaflow-project';
  version: number;
  exportedAt: string;
  project: Project;
  modules: {
    episodes: Episode[];
    shots: Shot[];
    characters: Character[];
    dubbing: DubbingLine[];
    synthesis: SynthesisConfig | null;
  };
}

export interface ProjectModules {
  episodes?: Episode[];
  shots?: Shot[];
  characters?: Character[];
  dubbing?: DubbingLine[];
}

/** 收集单个项目的完整数据（项目信息 + 全部模块），用于导出备份 */
export function collectProjectBundle(projectId: string): ProjectBundle | null {
  const project = loadProjects().find((p) => p.id === projectId);
  if (!project) return null;
  return {
    format: 'dramaflow-project',
    version: 1,
    exportedAt: new Date().toISOString(),
    project,
    modules: {
      episodes: loadModuleData<Episode[]>(projectId, 'episodes', []),
      shots: loadModuleData<Shot[]>(projectId, 'shots', []),
      characters: loadModuleData<Character[]>(projectId, 'characters', []),
      dubbing: loadModuleData<DubbingLine[]>(projectId, 'dubbing', []),
      synthesis: loadSynthesisConfig(projectId),
    },
  };
}

/** 校验并解析导入的 JSON，失败返回 null */
export function parseProjectBundle(json: string): ProjectBundle | null {
  try {
    const data = JSON.parse(json) as ProjectBundle;
    if (data?.format !== 'dramaflow-project' || !data?.project?.id || !data?.modules) return null;
    return data;
  } catch {
    return null;
  }
}

/** 将导入的数据重写为新的项目（新 id，避免与现有项目冲突） */
export function rebuildProjectFromBundle(bundle: ProjectBundle): { project: Project; modules: ProjectModules } {
  const newId = generateId();
  const project: Project = {
    ...bundle.project,
    id: newId,
    updatedAt: '刚刚',
    status: bundle.project.status === 'completed' ? 'completed' : 'draft',
  };
  const remap = <T extends { projectId: string }>(items: T[]): T[] =>
    Array.isArray(items) ? items.map((item) => ({ ...item, projectId: newId })) : [];

  return {
    project,
    modules: {
      episodes: remap(bundle.modules.episodes ?? []),
      shots: remap(bundle.modules.shots ?? []),
      characters: remap(bundle.modules.characters ?? []),
      dubbing: remap(bundle.modules.dubbing ?? []),
    },
  };
}

function loadSynthesisConfig(projectId: string): SynthesisConfig | null {
  try {
    const raw = localStorage.getItem(`dramaflow-module-${projectId}-synthesis`);
    return raw ? (JSON.parse(raw) as SynthesisConfig) : null;
  } catch {
    return null;
  }
}
