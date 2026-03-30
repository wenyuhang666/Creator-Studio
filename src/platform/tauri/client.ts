/**
 * Tauri 客户端封装
 *
 * 统一封装 invoke 调用，提供类型安全的 Tauri 命令调用
 */

import { invoke, isTauri } from "@tauri-apps/api/core";

/**
 * 安全地检测是否在 Tauri 环境中
 */
export function checkTauri(): boolean {
  try {
    return isTauri();
  } catch {
    return false;
  }
}

/**
 * 封装 invoke 调用
 */
export async function tauriInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) {
    throw new Error("当前为浏览器模式，文件系统能力不可用。请使用 npm run tauri:dev 并在桌面窗口中操作。");
  }
  return invoke<T>(command, args);
}

// ==================== 类型定义 ====================

export interface Provider {
  id: string;
  name: string;
  base_url: string;
  models: string[];
  models_updated_at: number | null;
  provider_type: string;
  headers?: Record<string, string> | null;
}

export interface ModelParameters {
  model: string;
  temperature: number;
  top_p: number;
  top_k: number | null;
  max_tokens: number;
}

export interface GlobalConfig {
  providers: Provider[];
  active_provider_id: string | null;
  default_parameters: ModelParameters;
}

export interface ProjectConfig {
  name: string;
  created: number;
  updated: number;
  version: string;
  settings: {
    autoSave: boolean;
    autoSaveInterval: number;
  };
}

export interface RecentProject {
  name: string;
  path: string;
  lastOpened: number;
}

export interface ChapterMeta {
  id: string;
  title: string;
  order: number;
  created: number;
  updated: number;
  wordCount: number;
}

export interface Session {
  id: string;
  name: string;
  mode: string;
  created: number;
  updated: number;
}

export interface Message {
  id: string;
  role: string;
  content: string;
  created: number;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeDoc {
  path: string;
  name: string;
  enabled: boolean;
}

export interface RagHit {
  docPath: string;
  content: string;
  score: number;
}

export interface RagIndexSummary {
  docCount: number;
  totalChars: number;
  indexBuiltAt: number | null;
}

export interface AIChatToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status: "calling" | "success" | "error";
  result?: string;
  error?: string;
  duration?: number;
}

export interface AIChatResult {
  content: string;
  tool_calls: AIChatToolCall[];
}

// ==================== 项目相关命令 ====================

export async function openProject(path: string): Promise<ProjectConfig> {
  return tauriInvoke<ProjectConfig>("open_project", { path });
}

export async function createProject(path: string, name: string): Promise<ProjectConfig> {
  return tauriInvoke<ProjectConfig>("create_project", { path, name });
}

export async function getRecentProjects(): Promise<RecentProject[]> {
  return tauriInvoke<RecentProject[]>("get_recent_projects");
}

export async function addRecentProject(name: string, path: string): Promise<void> {
  return tauriInvoke<void>("add_recent_project", { name, path });
}

export async function consumeUiCleanupFlag(): Promise<boolean> {
  return tauriInvoke<boolean>("consume_ui_cleanup_flag");
}

// ==================== 章节相关命令 ====================

export async function listChapters(projectPath: string): Promise<ChapterMeta[]> {
  return tauriInvoke<ChapterMeta[]>("list_chapters", { projectPath });
}

export async function getChapterContent(projectPath: string, chapterId: string): Promise<string> {
  return tauriInvoke<string>("get_chapter_content", { projectPath, chapterId });
}

export async function saveChapterContent(projectPath: string, chapterId: string, content: string): Promise<void> {
  return tauriInvoke<void>("save_chapter_content", { projectPath, chapterId, content });
}

export async function createChapter(projectPath: string, title: string): Promise<ChapterMeta> {
  return tauriInvoke<ChapterMeta>("create_chapter", { projectPath, title });
}

export async function deleteChapter(projectPath: string, chapterId: string): Promise<void> {
  return tauriInvoke<void>("delete_chapter", { projectPath, chapterId });
}

export async function renameChapter(projectPath: string, chapterId: string, newTitle: string): Promise<void> {
  return tauriInvoke<void>("rename_chapter", { projectPath, chapterId, newTitle });
}

export async function reorderChapters(projectPath: string, orderedIds: string[]): Promise<void> {
  return tauriInvoke<void>("reorder_chapters", { projectPath, orderedIds });
}

// ==================== 会话相关命令 ====================

export async function listSessions(projectPath: string): Promise<Session[]> {
  return tauriInvoke<Session[]>("list_sessions", { projectPath });
}

export async function createSession(projectPath: string, name: string, mode: string): Promise<Session> {
  return tauriInvoke<Session>("create_session", { projectPath, name, mode });
}

export async function getSessionMessages(projectPath: string, sessionId: string): Promise<Message[]> {
  return tauriInvoke<Message[]>("get_session_messages", { projectPath, sessionId });
}

export async function addMessage(projectPath: string, sessionId: string, role: string, content: string): Promise<Message> {
  return tauriInvoke<Message>("add_message", { projectPath, sessionId, role, content });
}

export async function deleteSession(projectPath: string, sessionId: string): Promise<void> {
  return tauriInvoke<void>("delete_session", { projectPath, sessionId });
}

export async function renameSession(projectPath: string, sessionId: string, newName: string): Promise<void> {
  return tauriInvoke<void>("rename_session", { projectPath, sessionId, newName });
}

// ==================== 配置相关命令 ====================

export async function getConfig(): Promise<GlobalConfig> {
  return tauriInvoke<GlobalConfig>("get_config");
}

export async function getApiKey(providerId: string): Promise<string | null> {
  return tauriInvoke<string | null>("get_api_key", { providerId });
}

export async function addProvider(provider: Provider, apiKey: string): Promise<void> {
  return tauriInvoke<void>("add_provider", { provider, apiKey });
}

export async function updateProvider(provider: Provider, apiKey: string | null): Promise<void> {
  return tauriInvoke<void>("update_provider", { provider, apiKey });
}

export async function deleteProvider(providerId: string): Promise<void> {
  return tauriInvoke<void>("delete_provider", { providerId });
}

export async function setActiveProvider(providerId: string): Promise<void> {
  return tauriInvoke<void>("set_active_provider", { providerId });
}

export async function refreshProviderModels(providerId: string): Promise<string[]> {
  return tauriInvoke<string[]>("refresh_provider_models", { providerId });
}

export async function setDefaultParameters(parameters: ModelParameters): Promise<void> {
  return tauriInvoke<void>("set_default_parameters", { parameters });
}

// ==================== 导入相关命令 ====================

export async function previewImportTxt(projectPath: string, filePath: string): Promise<{ title: string; content: string }[]> {
  return tauriInvoke<{ title: string; content: string }[]>("preview_import_txt", { projectPath, filePath });
}

export async function importTxt(projectPath: string, filePath: string, mode: string): Promise<number> {
  return tauriInvoke<number>("import_txt", { projectPath, filePath, mode });
}

// ==================== RAG 相关命令 ====================

export async function ragListDocs(projectPath: string): Promise<KnowledgeDoc[]> {
  return tauriInvoke<KnowledgeDoc[]>("rag_list_docs", { projectPath });
}

export async function ragReadDoc(projectPath: string, docPath: string): Promise<string> {
  return tauriInvoke<string>("rag_read_doc", { projectPath, docPath });
}

export async function ragSetDocEnabled(projectPath: string, docPath: string, enabled: boolean): Promise<void> {
  return tauriInvoke<void>("rag_set_doc_enabled", { projectPath, docPath, enabled });
}

export async function ragBuildIndex(projectPath: string): Promise<RagIndexSummary> {
  return tauriInvoke<RagIndexSummary>("rag_build_index", { projectPath });
}

export async function ragSearch(projectPath: string, query: string, topK: number): Promise<RagHit[]> {
  return tauriInvoke<RagHit[]>("rag_search", { projectPath, query, topK });
}

// ==================== AI Chat 命令 ====================

export interface AIChatParams {
  provider: {
    id: string;
    name: string;
    baseURL: string;
    apiKey: string;
    models: string[];
    providerType: string;
    headers?: Record<string, string>;
  };
  parameters: {
    model: string;
    temperature?: number;
    topP?: number;
    topK?: number;
    maxTokens?: number;
  };
  systemPrompt: string;
  messages: Array<{ role: string; content: string }>;
  projectDir: string;
  mode: string;
  chapterId: string | null;
  allowWrite: boolean;
}

export async function aiChat(params: AIChatParams): Promise<AIChatResult> {
  return tauriInvoke<AIChatResult>("ai_chat", params as unknown as Record<string, unknown>);
}

export async function aiComplete(params: {
  provider: AIChatParams["provider"];
  parameters: AIChatParams["parameters"];
  systemPrompt: string;
  messages: Array<{ role: string; content: string }>;
}): Promise<string> {
  return tauriInvoke<string>("ai_complete", params);
}

export async function aiCompleteCancel(): Promise<void> {
  return tauriInvoke<void>("ai_complete_cancel");
}
