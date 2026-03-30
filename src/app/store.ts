/**
 * 应用状态管理
 * 
 * 统一管理 App 层的状态，避免散落在多个组件中
 */

import { create } from "zustand";
import type { AppState, Project, ProjectConfig, RecentProject } from "./types";

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  currentProject: null,
  recentProjects: [],
  projectBusy: false,
  hasUnsavedChanges: false,
  createProjectModalOpen: false,

  // Actions
  setCurrentProject: (project: Project | null, _config?: ProjectConfig) =>
    set({ currentProject: project }),

  setRecentProjects: (projects: RecentProject[]) =>
    set({ recentProjects: projects }),

  setProjectBusy: (busy: boolean) =>
    set({ projectBusy: busy }),

  setHasUnsavedChanges: (hasChanges: boolean) =>
    set({ hasUnsavedChanges: hasChanges }),

  setCreateProjectModalOpen: (open: boolean) =>
    set({ createProjectModalOpen: open }),
}));
