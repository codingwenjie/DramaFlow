import { AIModelConfig, AIModelPurpose, AIModelSettings } from '../data/types';
import { generateId, savePersistent } from '../data/storage';

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
    purposes: ['script', 'polish', 'storyboard', 'character', 'suggestion', 'generic', 'image', 'dubbing'],
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
    id: 'dashscope-qwen-image',
    name: '通义万相 Qwen-Image',
    provider: 'dashscope',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKey: '',
    model: 'qwen-image-3.0',
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
    id: 'dashscope-tts',
    name: '通义语音 Qwen-TTS',
    provider: 'dashscope',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKey: '',
    model: 'qwen3-tts-flash',
    enabled: false,
    purposes: ['dubbing'],
  },
  {
    id: 'kling-video',
    name: '可灵 Kling 图生视频',
    provider: 'kling',
    baseUrl: 'https://api.klingai.com',
    apiKey: '',
    model: 'kling-v1-6',
    enabled: false,
    purposes: ['video'],
  },
  {
    id: 'volcengine-video',
    name: '火山 Seedance 图生视频',
    provider: 'volcengine',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    apiKey: '',
    model: 'doubao-seedance-1-5-pro-251215',
    enabled: false,
    purposes: ['video'],
  },
  {
    id: 'dashscope-wan-video',
    name: '通义万相 Wan 图生视频',
    provider: 'dashscope',
    baseUrl: 'https://dashscope.aliyuncs.com/api/v1',
    apiKey: '',
    model: 'wanx2.1-i2v-turbo',
    enabled: false,
    purposes: ['video'],
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
  {
    key: 'dashscope-image',
    label: '通义万相 Qwen-Image',
    provider: 'dashscope',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-image-3.0',
    description: '阿里云百炼文生图，qwen-image-3.0',
    purposes: ['image'],
  },
  {
    key: 'dashscope-tts',
    label: '通义语音 Qwen-TTS',
    provider: 'dashscope',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen3-tts-flash',
    description: '阿里云百炼语音合成，qwen3-tts-flash（可改为 qwen-tts）',
    purposes: ['dubbing'],
  },
  {
    key: 'kling-video',
    label: '可灵 Kling 视频',
    provider: 'kling',
    baseUrl: 'https://api.klingai.com',
    model: 'kling-v1-6',
    description: '图生视频，异步任务，按需付费（模型名可改为 kling-v2 系列）',
    purposes: ['video'],
  },
  {
    key: 'volcengine-video',
    label: '火山 Seedance 视频',
    provider: 'volcengine',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    model: 'doubao-seedance-1-5-pro-251215',
    description: '豆包 Seedance 图生视频，异步任务',
    purposes: ['video'],
  },
  {
    key: 'dashscope-wan-video',
    label: '通义万相 Wan 视频',
    provider: 'dashscope',
    baseUrl: 'https://dashscope.aliyuncs.com/api/v1',
    model: 'wanx2.1-i2v-turbo',
    description: '万相图生视频，异步任务（模型名可改为 wan2.x 系列）',
    purposes: ['video'],
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
      image: 'dashscope-qwen-image',
      dubbing: 'mock-default',
      video: 'custom-video',
      generic: 'mock-default',
    },
  };
}

/** 已启用且支持文生图用途的模型列表，用于分镜模块手动选择 */
export function getEnabledImageModels(
  settings: AIModelSettings = loadModelSettings()
): AIModelConfig[] {
  return settings.models.filter((m) => m.enabled && m.purposes.includes('image'));
}

/** 获取项目实际使用的文生图模型：项目手动选择优先，未选择时回退全局默认 */
export function getImageModelForProject(
  project?: { imageModelId?: string },
  settings: AIModelSettings = loadModelSettings()
): AIModelConfig | undefined {
  const enabled = getEnabledImageModels(settings);
  if (project?.imageModelId) {
    const picked = enabled.find((m) => m.id === project.imageModelId);
    if (picked) return picked;
  }
  return getModelForPurpose(settings, 'image');
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
    // 合并内置模型：新增的内置模型（如通义 TTS）自动加入，
    // 内置模拟模型按最新用途扩展，保证离线模式覆盖所有新增用途
    const modelsById = new Map<string, AIModelConfig>();
    for (const m of parsed.models ?? []) modelsById.set(m.id, m);
    for (const def of DEFAULT_MODELS) {
      const existing = modelsById.get(def.id);
      if (!existing) {
        modelsById.set(def.id, def);
      } else if (def.id === 'mock-default') {
        modelsById.set(def.id, {
          ...existing,
          purposes: Array.from(new Set([...(existing.purposes ?? []), ...def.purposes])),
        });
      }
    }
    parsed.models = Array.from(modelsById.values());
    parsed.defaults = parsed.defaults ?? getDefaultSettings().defaults;
    // 纠正指向已停用/不存在模型的默认分配（例如旧版 custom-tts 占位），回退到模拟模型
    for (const purpose of Object.keys(parsed.defaults) as AIModelPurpose[]) {
      const id = parsed.defaults[purpose];
      if (!id) continue;
      const m = parsed.models.find((x) => x.id === id);
      if (!m || !m.enabled) parsed.defaults[purpose] = 'mock-default';
    }
    return parsed;
  } catch (e) {
    console.error('Failed to load AI model settings:', e);
    return getDefaultSettings();
  }
}

export function saveModelSettings(settings: AIModelSettings): void {
  try {
    savePersistent(STORAGE_KEY, JSON.stringify(settings));
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
