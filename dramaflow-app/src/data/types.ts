export interface Project {
  id: string;
  name: string;
  scenes: number;
  duration: string;
  updatedAt: string;
  genre: string;
  status: 'active' | 'completed' | 'draft';
  orientation: 'vertical' | 'horizontal';
  createdAt: string;
  /** 该项目文生图使用的 AI 模型 ID（未设置时回退到全局默认） */
  imageModelId?: string;
  progress?: {
    script: number;
    storyboard: number;
    characters: number;
    dubbing: number;
    synthesis: number;
  };
}

export interface Episode {
  id: string;
  projectId: string;
  title: string;
  sceneNumber: number;
  type: string;
  location: string;
  time: string;
  characters: string[];
  words: number;
  content: string;
}

export interface Character {
  id: string;
  projectId: string;
  name: string;
  role: string;
  color: string;
  avatarUrl: string;
  stats: { scenes: number; lines: number };
  profile: { age: number; gender: string; occupation: string; personality: string };
  description: string;
  suggestions: string[];
  lineDistribution: { dialog: number; monologue: number; aside: number };
  currentVoice: string;
  voices: string[];
  /** 角色参考图（宫格切分后的单格图，db:// 引用），用于图生视频时保持角色一致性 */
  referenceImages?: string[];
}

export interface Shot {
  id: string;
  projectId: string;
  scene: number;
  type: string;
  angle: string;
  duration: string;
  desc: string;
  status: 'done' | 'generating' | 'pending';
  img: string;
  /** 视频生成提示词：镜头动态描述（图生视频的输入） */
  videoPrompt?: string;
  /** 该镜头配乐风格提示 */
  bgmPrompt?: string;
  /** 该镜头关键音效 */
  soundEffect?: string;
  /** 图生视频生成的视频（db:// 引用） */
  videoUrl?: string;
}

/** 图生视频异步任务（服务商任务 + 本地轮询状态） */
export interface VideoTask {
  id: string;
  projectId: string;
  shotId: string;
  provider: string;
  model: string;
  /** 服务商返回的任务 ID */
  taskId: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  prompt: string;
  /** 参考图（分镜图 dataURL 或 db:// 引用） */
  imageUrl: string;
  videoUrl?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

export interface DubbingLine {
  id: string;
  projectId: string;
  scene: number;
  character: string;
  characterColor: string;
  text: string;
  status: 'done' | 'generating' | 'pending';
  duration: string;
  emotion: string;
  speed: number;
  volume: number;
  /** 生成的配音音频（db:// 引用或 dataURL） */
  audioUrl?: string;
}

export interface SynthesisConfig {
  resolution: string;
  fps: number;
  bitrate: string;
  format: string;
  postProcessing: {
    colorGrading: boolean;
    bgm: boolean;
    subtitles: boolean;
    introOutro: boolean;
    watermarkRemoval: boolean;
  };
  /** 背景音乐素材（项目文件 db:// 引用的 fileId），未选择时不混入 BGM */
  bgmFileId?: string;
  /** 背景音乐音量（0~100，默认 30） */
  bgmVolume?: number;
}

/** BGM 素材库条目（文件本体存项目文件库，fileId 以 bgm- 开头） */
export interface BgmItem {
  fileId: string;
  name: string;
}

/** Prompt 模板：作为对应用途生成时的系统提示词（角色设定 + 输出格式） */
export interface PromptTemplate {
  id: string;
  name: string;
  /** 适用的 AI 用途（script / polish / storyboard / character / suggestion） */
  purpose: AIModelPurpose;
  desc: string;
  content: string;
  /** 启用后该用途的生成请求使用此模板；同一用途同时只启用一个 */
  enabled: boolean;
  builtin: boolean;
  updatedAt: string;
}

// AI 模型专业用途分类
export type AIModelPurpose =
  | 'script'
  | 'polish'
  | 'storyboard'
  | 'character'
  | 'suggestion'
  | 'image'
  | 'dubbing'
  | 'video'
  | 'generic';

export interface AIModelConfig {
  id: string;
  name: string;
  provider: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  enabled: boolean;
  purposes: AIModelPurpose[];
  temperature?: number;
  maxTokens?: number;
}

export interface AIModelSettings {
  models: AIModelConfig[];
  // 每个用途对应的默认模型 ID
  defaults: Partial<Record<AIModelPurpose, string>>;
}

export interface AppState {
  activeView: 'overview' | 'workflow';
  activeProjectId: string | null;
  activeTab: 'script' | 'storyboard' | 'characters' | 'dubbing' | 'synthesis';
  projects: Project[];
}
