import { AIService, AIGenerateScriptParams, AIGenerateShotsParams, AIDubbingParams, AIGenerateCharacterParams, AIGenerateSuggestionParams } from './ai';

export function createMockService(): AIService {
  return {
    name: 'Mock AI',
    generateScript: async (_params: AIGenerateScriptParams): Promise<string> => {
      await delay(1500);
      return `【AI 生成剧本】\n\n生成的剧本内容...\n\n（这是模拟 AI 生成结果，实际使用时请配置真实 AI 服务）`;
    },
    generateShots: async (_params: AIGenerateShotsParams): Promise<string[]> => {
      await delay(2000);
      return [
        '全景镜头：场景全貌展示',
        '中景镜头：人物互动',
        '特写镜头：表情细节',
      ];
    },
    generateDubbing: async (_params: AIDubbingParams): Promise<string> => {
      await delay(2500);
      return 'mock-audio-url';
    },
    generateCharacter: async (_params: AIGenerateCharacterParams): Promise<string> => {
      await delay(1500);
      return `${_params.name}是一名${_params.role}，性格鲜明，在故事中扮演关键角色。`;
    },
    generateSuggestions: async (_params: AIGenerateSuggestionParams): Promise<string[]> => {
      await delay(1000);
      return [
        '加强情感冲突表现',
        '增加环境描写细节',
        '优化对话节奏',
      ];
    },
    polishScript: async (content: string, _instruction?: string): Promise<string> => {
      await delay(2000);
      return content + '\n\n（AI 润色后的内容）';
    },
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}