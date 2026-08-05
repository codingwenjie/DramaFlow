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

// 获取当前 AI 服务实例
export function getAIService(): AIService {
  // 从环境变量读取配置，默认使用 mock
  const provider = (import.meta.env.VITE_AI_PROVIDER || 'mock') as AIProvider;
  if (provider === 'openai' && import.meta.env.VITE_OPENAI_API_KEY) {
    // 返回 OpenAI 实现（待后续接入）
    throw new Error('OpenAI provider not yet implemented');
  }
  // 默认返回 mock 服务
  const { createMockService } = require('./ai-mock');
  return createMockService();
}