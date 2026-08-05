import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Project } from '../data/types';
import { generateId, saveProjects, loadProjects } from '../data/storage';

interface ProjectState {
  projects: Project[];
  addProject: (name: string, genre: string, scenes: number, orientation: 'vertical' | 'horizontal') => Project;
  updateProject: (id: string, updates: Partial<Project>) => void;
  removeProject: (id: string) => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: loadProjects(),
      addProject: (name, genre, scenes, orientation) => {
        const now = new Date();
        const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const newProject: Project = {
          id: generateId(),
          name,
          scenes,
          duration: '0:00',
          updatedAt: '刚刚',
          genre,
          status: 'draft',
          orientation,
          createdAt: timeStr,
          progress: { script: 0, storyboard: 0, characters: 0, dubbing: 0, synthesis: 0 },
        };
        set((state) => ({ projects: [newProject, ...state.projects] }));
        saveProjects([newProject, ...get().projects]);
        return newProject;
      },
      updateProject: (id, updates) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        }));
        saveProjects(get().projects);
      },
      removeProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
        }));
        saveProjects(get().projects);
      },
    }),
    {
      name: 'dramaflow-projects',
      storage: {
        getItem: (_name) => {
          const stored = loadProjects();
          return { state: { projects: stored }, version: 0 };
        },
        setItem: (_name, value) => {
          saveProjects(value.state.projects);
        },
        removeItem: () => {},
      },
    }
  )
);