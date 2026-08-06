import { AIService, AIGenerateScriptParams, AIGenerateShotsParams, AIGenerateImageParams, AIDubbingParams, AIGenerateCharacterParams, AIGenerateSuggestionParams } from './ai';

export function createMockService(): AIService {
  return {
    name: 'Mock AI',
    generateScript: async (_params: AIGenerateScriptParams): Promise<string> => {
      await delay(1500);
      return (
        '### 第1幕 ｜ 场景：内景·咖啡馆·白天 ｜ 人物：林晓、陈诺\n\n' +
        '【场景描述】\n' +
        '咖啡馆全景，阳光透过玻璃窗洒在桌面上。陈诺推门走进来，环顾四周，在靠窗位置看到了低头看书的林晓。\n\n' +
        '林晓：（慌乱）天哪，对不起！我真的不是故意的……\n' +
        '陈诺：没事。\n\n' +
        '### 第2幕 ｜ 场景：外景·公司门口·傍晚 ｜ 人物：陈诺、林晓\n\n' +
        '【场景描述】\n' +
        '公司门口，傍晚时分，人群渐渐散去。陈诺的车停在路边，他看到林晓匆忙跑出来，上前拦住了她。\n\n' +
        '林晓：陈总？您怎么在这里？\n' +
        '陈诺：我看了你的策划方案，很有想法。'
      );
    },
    generateShots: async (_params: AIGenerateShotsParams): Promise<string[]> => {
      await delay(2000);
      const count = Math.max(2, Math.min(8, _params.sceneCount ?? 3));
      return Array.from({ length: count }, (_, i) => {
        const templates = [
          '全景|平视|3.5|场景全貌展示，交代环境与光线',
          '中景|微俯|2.0|人物入场，镜头跟随走动',
          '特写|平视|1.5|表情细节特写，情绪变化',
          '中近景|平视|2.5|人物对话，正反打节奏',
          '过肩镜|平视|2.0|人物互动，突出对话关系',
        ];
        return templates[i % templates.length];
      });
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
      return content;
    },
    generateImage: async (_params: AIGenerateImageParams): Promise<string> => {
      await delay(800);
      // 生成一张琥珀色渐变占位图（含提示词摘要），接入真实文生图后自动替换
      const text = _params.prompt.length > 60 ? _params.prompt.slice(0, 60) + '…' : _params.prompt;
      const safeText = escapeXml(text);
      const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">` +
        `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
        `<stop offset="0" stop-color="#232833"/><stop offset="1" stop-color="#E69500"/></linearGradient></defs>` +
        `<rect width="512" height="512" fill="url(#g)"/>` +
        `<rect x="36" y="36" width="440" height="440" rx="16" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="2"/>` +
        `<text x="256" y="220" font-family="sans-serif" font-size="26" fill="#FFFFFF" text-anchor="middle">🎬 分镜占位图</text>` +
        `<text x="256" y="280" font-family="sans-serif" font-size="16" fill="rgba(255,255,255,0.85)" text-anchor="middle">${safeText}</text>` +
        `<text x="256" y="440" font-family="sans-serif" font-size="14" fill="rgba(255,255,255,0.6)" text-anchor="middle">DramaFlow · AI 分镜</text>` +
        `</svg>`;
      return `data:image/svg+xml,${encodeURIComponent(svg)}`;
    },
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      default: return '&quot;';
    }
  });
}
