import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project } from '../data/types';
import {
  generateId,
  generateModuleId,
  saveProjects,
  loadProjects,
  saveModuleData,
  clearAllProjectData,
} from '../data/storage';
import type { ProjectModules } from '../data/project-io';

interface ProjectState {
  projects: Project[];
  addProject: (name: string, genre: string, scenes: number, orientation: 'vertical' | 'horizontal') => Project;
  updateProject: (id: string, updates: Partial<Project>) => void;
  removeProject: (id: string) => void;
  importProject: (project: Project, modules: ProjectModules) => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: loadProjects(),
      addProject: (name, genre, scenes, orientation) => {
        const now = new Date();
        const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const id = generateId();
        const newProject: Project = {
          id,
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

        // 初始化各模块数据骨架，避免串用示例数据
        const initialEpisodes = Array.from({ length: scenes }, (_, i) => ({
          id: generateModuleId('s'),
          projectId: id,
          title: `第${i + 1}幕`,
          sceneNumber: i + 1,
          type: '内景',
          location: '待定',
          time: '白天',
          characters: [],
          words: 0,
          content: '',
        }));
        saveModuleData(id, 'episodes', initialEpisodes);
        saveModuleData(id, 'shots', []);
        saveModuleData(id, 'dubbing', []);
        saveModuleData(id, 'characters', []);

        set((state) => ({ projects: [newProject, ...state.projects] }));
        saveProjects(get().projects);
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
        clearAllProjectData(id);
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
        }));
        saveProjects(get().projects);
      },
      importProject: (project, modules) => {
        const withModules: ProjectModules = modules;
        if (withModules.episodes) saveModuleData(project.id, 'episodes', withModules.episodes);
        if (withModules.shots) saveModuleData(project.id, 'shots', withModules.shots);
        if (withModules.characters) saveModuleData(project.id, 'characters', withModules.characters);
        if (withModules.dubbing) saveModuleData(project.id, 'dubbing', withModules.dubbing);
        set((state) => ({ projects: [project, ...state.projects] }));
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
