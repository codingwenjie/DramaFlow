import { AIModelConfig, AIModelPurpose, AIModelSettings } from '../data/types';
import { generateId } from '../data/storage';

const STORAGE_KEY = 'dramaflow-ai-models';

export const PURPOSE_LABELS: Record<AIModelPurpose, string> = {
  script: '剧本生成',
  polish: '剧本润色',
  storyboard: '分镜生成',
  character: '角色人设',
  suggestion: 'AI 建议',
  image: '文生图',
  dubbing: '配音生成',
  video: '视频生成',
  generic: '通用对话',
};

export const PURPOSE_DESCRIPTIONS: Record<AIModelPurpose, string> = {
  script: '根据提示词生成短剧剧本内容',
  polish: '优化、改写、润色现有剧本',
  storyboard: '根据剧本内容生成分镜描述',
  character: '根据角色信息生成人设描述',
  suggestion: '针对剧本、角色、分镜给出建议',
  image: '根据文本描述生成图片素材',
  dubbing: '根据台词生成配音音频',
  video: '根据素材生成视频片段',
  generic: '通用多轮对话',
};

export const DEFAULT_MODELS: AIModelConfig[] = [
  {
    id: 'mock-default',
    name: '模拟 AI（离线）',
    provider: 'mock',
    baseUrl: '',
    apiKey: '',
    model: 'mock',
    enabled: true,
    purposes: ['script', 'polish', 'storyboard', 'character', 'suggestion', 'generic', 'image'],
  },
  {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    provider: 'deepseek',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKey: '',
    model: 'deepseek-chat',
    enabled: false,
    purposes: ['script', 'polish', 'storyboard', 'character', 'suggestion', 'generic'],
  },
  {
    id: 'dashscope-qwen-plus',
    name: '通义千问 Qwen-Plus',
    provider: 'dashscope',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKey: '',
    model: 'qwen-plus',
    enabled: false,
    purposes: ['script', 'polish', 'storyboard', 'character', 'suggestion', 'generic'],
  },
  {
    id: 'zhipu-glm-4-flash',
    name: '智谱 GLM-4-Flash',
    provider: 'zhipu',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    apiKey: '',
    model: 'glm-4-flash',
    enabled: false,
    purposes: ['script', 'polish', 'storyboard', 'character', 'suggestion', 'generic'],
  },
  {
    id: 'openai-gpt4o-mini',
    name: 'OpenAI GPT-4o mini',
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o-mini',
    enabled: false,
    purposes: ['script', 'polish', 'storyboard', 'character', 'suggestion', 'generic'],
  },
  {
    id: 'openai-dalle3',
    name: 'OpenAI DALL·E 3',
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'dall-e-3',
    enabled: false,
    purposes: ['image'],
  },
  {
    id: 'siliconflow-flux',
    name: '硅基流动 FLUX',
    provider: 'siliconflow',
    baseUrl: 'https://api.siliconflow.cn/v1',
    apiKey: '',
    model: 'black-forest-labs/FLUX.1-schnell',
    enabled: false,
    purposes: ['image'],
  },
  {
    id: 'custom-tts',
    name: '自定义 TTS',
    provider: 'custom',
    baseUrl: '',
    apiKey: '',
    model: '',
    enabled: false,
    purposes: ['dubbing'],
  },
  {
    id: 'custom-video',
    name: '自定义视频模型',
    provider: 'custom',
    baseUrl: '',
    apiKey: '',
    model: '',
    enabled: false,
    purposes: ['video'],
  },
];

export interface ModelPreset {
  key: string;
  label: string;
  provider: string;
  baseUrl: string;
  model: string;
  description: string;
  purposes: AIModelPurpose[];
}

/** 常用服务商预设，配置页一键添加 */
export const MODEL_PRESETS: ModelPreset[] = [
  {
    key: 'deepseek',
    label: 'DeepSeek',
    provider: 'deepseek',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    description: '性价比高，国产模型，注册送额度',
    purposes: ['script', 'polish', 'storyboard', 'character', 'suggestion', 'generic'],
  },
  {
    key: 'dashscope',
    label: '通义千问',
    provider: 'dashscope',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
    description: '阿里云百炼，兼容 OpenAI 接口',
    purposes: ['script', 'polish', 'storyboard', 'character', 'suggestion', 'generic'],
  },
  {
    key: 'zhipu',
    label: '智谱 GLM',
    provider: 'zhipu',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4-flash',
    description: '智谱开放平台，Flash 免费额度',
    purposes: ['script', 'polish', 'storyboard', 'character', 'suggestion', 'generic'],
  },
  {
    key: 'openai',
    label: 'OpenAI',
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    description: '海外服务，需要可访问的网络',
    purposes: ['script', 'polish', 'storyboard', 'character', 'suggestion', 'generic'],
  },
  {
    key: 'siliconflow',
    label: '硅基流动 FLUX',
    provider: 'siliconflow',
    baseUrl: 'https://api.siliconflow.cn/v1',
    model: 'black-forest-labs/FLUX.1-schnell',
    description: '文生图，注册送免费额度，OpenAI 兼容',
    purposes: ['image'],
  },
];

export function getDefaultSettings(): AIModelSettings {
  return {
    models: DEFAULT_MODELS,
    defaults: {
      script: 'mock-default',
      polish: 'mock-default',
      storyboard: 'mock-default',
      character: 'mock-default',
      suggestion: 'mock-default',
      image: 'openai-dalle3',
      dubbing: 'custom-tts',
      video: 'custom-video',
      generic: 'mock-default',
    },
  };
}

export function loadModelSettings(): AIModelSettings {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      const defaults = getDefaultSettings();
      saveModelSettings(defaults);
      return defaults;
    }
    const parsed = JSON.parse(data) as AIModelSettings;
    // 合并默认模型，确保新用途有对应模型
    if (!parsed.models || parsed.models.length === 0) {
      parsed.models = DEFAULT_MODELS;
    }
    if (!parsed.defaults) {
      parsed.defaults = getDefaultSettings().defaults;
    }
    return parsed;
  } catch (e) {
    console.error('Failed to load AI model settings:', e);
    return getDefaultSettings();
  }
}

export function saveModelSettings(settings: AIModelSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save AI model settings:', e);
  }
}

export function createEmptyModel(purposes: AIModelPurpose[] = ['generic']): AIModelConfig {
  return {
    id: generateId(),
    name: '新模型',
    provider: 'custom',
    baseUrl: '',
    apiKey: '',
    model: '',
    enabled: true,
    purposes,
  };
}

export function getModelForPurpose(
  settings: AIModelSettings,
  purpose: AIModelPurpose
): AIModelConfig | undefined {
  const defaultId = settings.defaults[purpose];
  if (defaultId) {
    const model = settings.models.find((m) => m.id === defaultId && m.enabled);
    if (model) return model;
  }
  // 回退：找支持该用途且启用的第一个模型
  return settings.models.find((m) => m.enabled && m.purposes.includes(purpose));
}
