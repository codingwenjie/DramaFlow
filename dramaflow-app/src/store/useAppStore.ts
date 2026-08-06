import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ViewMode = 'overview' | 'workflow' | 'api-config' | 'prompt-skills';
export type WorkflowTab = 'script' | 'storyboard' | 'characters' | 'dubbing' | 'synthesis';

interface AppState {
  activeView: ViewMode;
  activeTab: WorkflowTab;
  activeProjectId: string | null;
  setActiveView: (view: ViewMode) => void;
  setActiveTab: (tab: WorkflowTab) => void;
  setActiveProjectId: (id: string | null) => void;
  navigateToProject: (id: string) => void;
  navigateToOverview: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeView: 'overview',
      activeTab: 'script',
      activeProjectId: null,
      setActiveView: (view) => set({ activeView: view }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setActiveProjectId: (id) => set({ activeProjectId: id }),
      navigateToProject: (id) =>
        set({ activeProjectId: id, activeView: 'workflow' }),
      navigateToOverview: () =>
        set({ activeView: 'overview', activeProjectId: null }),
    }),
    {
      name: 'dramaflow-app-state',
    }
  )
);