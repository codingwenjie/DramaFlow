import { AIModelPurpose, AIModelSettings } from '../data/types';
import { createMockService } from './ai-mock';
import { createOpenAIService } from './ai-openai';
import { getModelForPurpose, loadModelSettings } from './ai-models';

export type AIProvider = 'mock' | 'openai' | 'custom';

export interface AIServiceConfig {
  provider: AIProvider;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export interface AIGenerateScriptParams {
  prompt: string;
  context?: string;
  genre?: string;
  sceneCount?: number;
}

export interface AIGenerateShotsParams {
  scriptContent: string;
  scene: string;
  style?: string;
}

export interface AIDubbingParams {
  text: string;
  character: string;
  emotion: string;
  speed: number;
  volume: number;
}

export interface AIGenerateCharacterParams {
  name: string;
  role: string;
  genre?: string;
}

export interface AIGenerateSuggestionParams {
  context: string;
  type: 'script' | 'character' | 'storyboard';
}

export interface AIService {
  name: string;
  generateScript(params: AIGenerateScriptParams): Promise<string>;
  generateShots(params: AIGenerateShotsParams): Promise<string[]>;
  generateDubbing(params: AIDubbingParams): Promise<string>; // returns audio URL
  generateCharacter(params: AIGenerateCharacterParams): Promise<string>;
  generateSuggestions(params: AIGenerateSuggestionParams): Promise<string[]>;
  polishScript(content: string, instruction?: string): Promise<string>;
}

export function createAIService(config: AIServiceConfig): AIService {
  if (config.provider === 'openai') {
    throw new Error('Legacy getAIService(config) is not supported; use getAIServiceForPurpose instead');
  }
  return createMockService();
}

// 根据用途获取对应的 AI 服务实例
export function getAIServiceForPurpose(
  purpose: AIModelPurpose,
  settings: AIModelSettings = loadModelSettings()
): AIService {
  const model = getModelForPurpose(settings, purpose);
  if (!model) {
    throw new Error(`没有可用的 AI 模型用于「${purpose}」，请在 AI 模型配置中启用至少一个支持该用途的模型。`);
  }

  if (model.provider === 'mock') {
    return createMockService();
  }

  if (model.provider === 'openai') {
    return createOpenAIService(model, purpose);
  }

  // custom 暂 fallback 到 mock
  return createMockService();
}

// 兼容旧调用：默认返回通用/剧本用途的服务
export function getAIService(): AIService {
  return getAIServiceForPurpose('script');
}