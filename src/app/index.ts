/**
 * 应用层 - 负责启动、全局 Provider、错误边界
 */

// Re-export bootstrap
export { bootstrapApp } from "./bootstrap";

// Re-export providers
export { AppProviders } from "./AppProviders";

// Re-export store
export { useAppStore } from "./store";

// Re-export types
export type { AppState, Project, RecentProject, CreateProjectFn, OpenProjectFn } from "./types";
