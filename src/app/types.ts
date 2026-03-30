/**
 * 应用层类型定义
 */

export interface Project {
  path: string;
  name: string;
}

export interface ProjectConfig {
  name: string;
  created: number;
  updated: number;
  version: string;
  settings: ProjectSettings;
}

export interface ProjectSettings {
  autoSave: boolean;
  autoSaveInterval: number;
}

export interface RecentProject {
  name: string;
  path: string;
  lastOpened: number;
}

export type CreateProjectFn = (name: string, parentPath: string) => Promise<void>;
export type OpenProjectFn = (path: string) => Promise<void>;

export interface AppState {
  // Project state
  currentProject: Project | null;
  recentProjects: RecentProject[];
  projectBusy: boolean;
  hasUnsavedChanges: boolean;
  
  // UI state
  createProjectModalOpen: boolean;
  
  // Actions
  setCurrentProject: (project: Project | null, config?: ProjectConfig) => void;
  setRecentProjects: (projects: RecentProject[]) => void;
  setProjectBusy: (busy: boolean) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  setCreateProjectModalOpen: (open: boolean) => void;
}
