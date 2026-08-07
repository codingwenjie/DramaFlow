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
      await delay(1200);
      // 模拟模式生成一段可播放的提示音 WAV，保证离线也能完整走通配音流程
      const isMale = /男/.test(_params.voice ?? _params.character);
      const freq = emotionFreq(_params.emotion) ?? (isMale ? 130 : 220);
      return createMockWavDataUrl(_params.text, freq);
    },
    generateCharacter: async (_params: AIGenerateCharacterParams): Promise<string> => {
      await delay(1500);
      return (
        `## 角色定位\n${_params.name}是${_params.role}，在故事中扮演关键角色，推动主线冲突发展。\n\n` +
        `## 性格特征\n- 性格鲜明，立场坚定\n- 重情重义，关键时刻愿意牺牲自己\n- 表面强势，内心柔软\n\n` +
        `## 背景故事\n与核心事件有直接关联，过去的经历埋下了重要的剧情伏笔。\n\n` +
        `## 人物弧光\n从最初的固执到逐渐理解他人，最终完成自我成长。`
      );
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

/** 情绪 → 提示音频率（让模拟配音也能听出情绪差异） */
function emotionFreq(emotion: string | undefined): number | undefined {
  switch (emotion) {
    case 'happy':
      return 523; // 轻快高音
    case 'angry':
      return 196; // 低沉急促
    case 'sad':
      return 165; // 低落
    case 'surprise':
      return 440;
    case 'fear':
      return 110; // 低沉颤抖感
    default:
      return undefined;
  }
}

/** 生成一段带淡入淡出的提示音 WAV（模拟配音），返回 dataURL */
function createMockWavDataUrl(text: string, freq: number): string {
  const sampleRate = 16000;
  const seconds = Math.max(0.5, Math.min(6, text.replace(/\s/g, '').length * 0.22));
  const numSamples = Math.floor(sampleRate * seconds);
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // 单声道
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.min(1, t / 0.05) * Math.min(1, (seconds - t) / 0.05);
    const vib = 1 + 0.05 * Math.sin(2 * Math.PI * 6 * t);
    const sample = Math.sin(2 * Math.PI * freq * vib * t) * 0.35 * envelope;
    view.setInt16(44 + i * 2, Math.round(sample * 32767), true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return `data:audio/wav;base64,${btoa(binary)}`;
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
