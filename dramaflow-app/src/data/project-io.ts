import { generateId, loadModuleData, loadProjects, loadProjectFile } from './storage';
import type { BgmItem, Character, DubbingLine, Episode, Project, Shot, SynthesisConfig } from './types';

export interface ProjectFileEntry {
  /** 相对 fileId（不含项目前缀），导入时写入新项目即可复用 */
  fileId: string;
  type: string;
  base64: string;
}

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
    /** BGM 素材库清单（v3 新增；文件本体在 files 中） */
    bgmLibrary?: BgmItem[];
  };
  /** 项目内引用的本地文件（分镜图/角色图/配音音频/BGM），视频文件暂不打包避免备份过大 */
  files: ProjectFileEntry[];
}

export interface ProjectModules {
  episodes?: Episode[];
  shots?: Shot[];
  characters?: Character[];
  dubbing?: DubbingLine[];
  bgmLibrary?: BgmItem[];
}

/** 收集单个项目的完整数据（项目信息 + 全部模块 + 本地文件），用于导出备份 */
export async function collectProjectBundle(projectId: string): Promise<ProjectBundle | null> {
  const project = loadProjects().find((p) => p.id === projectId);
  if (!project) return null;
  const episodes = loadModuleData<Episode[]>(projectId, 'episodes', []);
  const shots = loadModuleData<Shot[]>(projectId, 'shots', []);
  const characters = loadModuleData<Character[]>(projectId, 'characters', []);
  const dubbing = loadModuleData<DubbingLine[]>(projectId, 'dubbing', []);
  const bgmLibrary = loadModuleData<BgmItem[]>(projectId, 'bgmLibrary', []);
  const synthesis = loadSynthesisConfig(projectId);

  // 收集模块中所有 db:// 引用（视频文件不打包，避免备份体积过大）
  const fileIds = new Set<string>();
  const collectRef = (ref?: string) => {
    if (ref && ref.startsWith('db://')) fileIds.add(ref.slice(5));
  };
  for (const s of shots) collectRef(s.img);
  for (const c of characters) {
    collectRef(c.avatarUrl);
    for (const r of c.referenceImages ?? []) collectRef(r);
  }
  for (const d of dubbing) collectRef(d.audioUrl);
  if (synthesis?.bgmFileId) collectRef(`db://${synthesis.bgmFileId}`);
  for (const b of bgmLibrary) collectRef(`db://${b.fileId}`);

  const files: ProjectFileEntry[] = [];
  for (const fileId of fileIds) {
    const blob = await loadProjectFile(projectId, fileId).catch(() => undefined);
    if (blob) {
      files.push({
        fileId,
        type: blob.type || 'application/octet-stream',
        base64: await blobToBase64(blob),
      });
    }
  }

  return {
    format: 'dramaflow-project',
    version: 2,
    exportedAt: new Date().toISOString(),
    project,
    modules: {
      episodes,
      shots,
      characters,
      dubbing,
      synthesis,
      bgmLibrary,
    },
    files,
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
export function rebuildProjectFromBundle(
  bundle: ProjectBundle
): { project: Project; modules: ProjectModules; files: ProjectFileEntry[] } {
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
      bgmLibrary: Array.isArray(bundle.modules.bgmLibrary) ? bundle.modules.bgmLibrary : [],
    },
    files: Array.isArray(bundle.files) ? bundle.files : [],
  };
}

/** Blob → base64（读 dataURL 取后半段，兼容大文件分块） */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      resolve(result.includes(',') ? result.slice(result.indexOf(',') + 1) : result);
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(blob);
  });
}

/** base64 + MIME → Blob（导入时写回本地文件库） */
export function base64ToBlob(base64: string, type: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: type || 'application/octet-stream' });
}

function loadSynthesisConfig(projectId: string): SynthesisConfig | null {
  try {
    const raw = localStorage.getItem(`dramaflow-module-${projectId}-synthesis`);
    return raw ? (JSON.parse(raw) as SynthesisConfig) : null;
  } catch {
    return null;
  }
}
