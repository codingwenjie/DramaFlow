/// <reference types="vite/client" />

import type { SynthesisJobInput, SynthesisProgress, SynthesisResult } from '../electron/synthesis';

declare global {
  interface Window {
    electronAPI?: {
      platform: string;
      synthesize: (job: SynthesisJobInput) => Promise<SynthesisResult>;
      saveVideo: (sourcePath: string, defaultName: string) => Promise<string | null>;
      /** 保存文本文件（项目备份导出，桌面版走原生保存对话框） */
      saveFile: (payload: { defaultName: string; content: string }) => Promise<string | null>;
      /** 打开文本文件（项目备份导入，桌面版走原生打开对话框） */
      openFile: (
        filters?: { name: string; extensions: string[] }[]
      ) => Promise<{ name: string; content: string } | null>;
      onSynthesisProgress: (callback: (progress: SynthesisProgress) => void) => () => void;
    };
  }
}

export {};
