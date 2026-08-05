import { Project } from './types';
import { loadProjects, saveProjects } from './storage';

export type { Project } from './types';

import type { WorkflowTab } from '../store/useAppStore';

export interface TabItem {
  id: WorkflowTab;
  label: string;
  status: string;
}

export const PROJECTS: Project[] = [
  {
    id: 'p1',
    name: '都市迷情·第三季',
    scenes: 24,
    duration: '18:32',
    updatedAt: '今天 14:23',
    genre: '都市',
    status: 'active',
    orientation: 'vertical',
    createdAt: '2025-06-01',
    progress: { script: 100, storyboard: 80, characters: 25, dubbing: 0, synthesis: 0 },
  },
  {
    id: 'p2',
    name: '重生之巅峰时代',
    scenes: 18,
    duration: '12:10',
    updatedAt: '昨天 22:05',
    genre: '逆袭',
    status: 'active',
    orientation: 'horizontal',
    createdAt: '2025-06-15',
    progress: { script: 100, storyboard: 100, characters: 60, dubbing: 30, synthesis: 0 },
  },
  {
    id: 'p3',
    name: '霸总的秘密花园',
    scenes: 31,
    duration: '24:44',
    updatedAt: '3天前',
    genre: '甜宠',
    status: 'active',
    orientation: 'vertical',
    createdAt: '2025-07-03',
    progress: { script: 100, storyboard: 100, characters: 100, dubbing: 90, synthesis: 50 },
  },
];

export function getProjects(): Project[] {
  const stored = loadProjects();
  if (stored.length > 0) {
    return stored;
  }
  saveProjects(PROJECTS);
  return PROJECTS;
}

export const TABS: TabItem[] = [
  { id: 'script', label: '剧本创作', status: 'done' },
  { id: 'storyboard', label: '分镜生成', status: 'done' },
  { id: 'characters', label: '角色管理', status: 'active' },
  { id: 'dubbing', label: '场景配音', status: 'pending' },
  { id: 'synthesis', label: '视频合成', status: 'pending' },
];