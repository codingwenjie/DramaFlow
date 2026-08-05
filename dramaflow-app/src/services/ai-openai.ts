import {
  AIService,
  AIGenerateScriptParams,
  AIGenerateShotsParams,
  AIDubbingParams,
  AIGenerateCharacterParams,
  AIGenerateSuggestionParams,
} from './ai';
import { AIModelConfig, AIModelPurpose } from '../data/types';

interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

export function createOpenAIService(config: AIModelConfig, purpose: AIModelPurpose): AIService {
  async function chatCompletion(systemPrompt: string, userPrompt: string): Promise<string> {
    const res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ] as ChatMessage[],
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens ?? 2048,
      }),
    });
    if (!res.ok) {
      throw new Error(`OpenAI API error: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as { choices: { message: { content: string } }[] };
    return data.choices[0]?.message?.content?.trim() ?? '';
  }

  const baseName = `${config.name} (${purpose})`;

  return {
    name: baseName,

    generateScript: async (_params: AIGenerateScriptParams): Promise<string> => {
      return chatCompletion(
        '你是一位资深短剧编剧，擅长创作节奏紧凑、冲突强烈的短剧剧本。',
        `请根据以下要求生成短剧剧本：\n提示：${_params.prompt}\n题材：${_params.genre || '不限'}\n幕数：${_params.sceneCount || '自动'}\n上下文：${_params.context || '无'}`
      );
    },

    generateShots: async (_params: AIGenerateShotsParams): Promise<string[]> => {
      const text = await chatCompletion(
        '你是一位专业分镜师，擅长将剧本转化为具体的镜头语言描述。',
        `请根据以下剧本内容，为「${_params.scene}」场景生成分镜描述列表，每行一个镜头。\n\n${_params.scriptContent}`
      );
      return text.split('\n').map((line) => line.replace(/^[-\d.\s]+/, '')).filter(Boolean);
    },

    generateDubbing: async (_params: AIDubbingParams): Promise<string> => {
      // OpenAI 本身没有 TTS 的直接音频 URL 返回，这里返回占位符
      // 实际接入时应调用 /audio/speech 并返回 blob URL
      return 'openai-tts-mock-url';
    },

    generateCharacter: async (_params: AIGenerateCharacterParams): Promise<string> => {
      return chatCompletion(
        '你是一位人物设定专家，擅长为短剧角色创作立体丰满的人设。',
        `请为短剧角色「${_params.name}」创作人设。角色定位：${_params.role}。题材：${_params.genre || '现代都市'}。`
      );
    },

    generateSuggestions: async (_params: AIGenerateSuggestionParams): Promise<string[]> => {
      const text = await chatCompletion(
        '你是一位短剧创作顾问，擅长给出具体、可执行的改进建议。',
        `请针对以下${_params.type === 'script' ? '剧本' : _params.type === 'character' ? '角色' : '分镜'}内容给出 3-5 条优化建议：\n\n${_params.context}`
      );
      return text.split('\n').map((line) => line.replace(/^[-\d.\s]+/, '')).filter(Boolean);
    },

    polishScript: async (content: string, _instruction?: string): Promise<string> => {
      return chatCompletion(
        '你是一位资深剧本编辑，擅长优化台词节奏、增强戏剧冲突。',
        `请根据以下要求润色剧本：${_instruction || '优化表达，增强戏剧张力'}\n\n${content}`
      );
    },
  };
}
