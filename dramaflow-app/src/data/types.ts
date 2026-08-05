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
}

export interface AppState {
  activeView: 'overview' | 'workflow';
  activeProjectId: string | null;
  activeTab: 'script' | 'storyboard' | 'characters' | 'dubbing' | 'synthesis';
  projects: Project[];
}