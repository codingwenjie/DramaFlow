/// <reference types="vite/client" />

import type { SynthesisJobInput, SynthesisProgress, SynthesisResult } from '../electron/synthesis';

declare global {
  interface Window {
    electronAPI?: {
      platform: string;
      synthesize: (job: SynthesisJobInput) => Promise<SynthesisResult>;
      saveVideo: (sourcePath: string, defaultName: string) => Promise<string | null>;
      onSynthesisProgress: (callback: (progress: SynthesisProgress) => void) => () => void;
    };
  }
}

export {};
