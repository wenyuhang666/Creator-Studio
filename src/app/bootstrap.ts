/**
 * 应用启动引导
 * 
 * 封装应用启动时的初始化逻辑
 */

import { isTauri } from "@tauri-apps/api/core";
import { invoke } from "@tauri-apps/api/core";
import { message } from "antd";
import { formatError } from "../utils/error";

/**
 * 加载最近项目列表
 */
export async function loadRecentProjects(): Promise<Array<{ name: string; path: string; lastOpened: number }>> {
  if (!isTauri()) {
    return [];
  }
  try {
    return (await invoke("get_recent_projects")) as Array<{ name: string; path: string; lastOpened: number }>;
  } catch {
    return [];
  }
}

/**
 * 清理 UI 状态（用于重装后清理旧状态）
 */
export async function clearUiStateIfNeeded(): Promise<void> {
  if (!isTauri()) return;

  try {
    const shouldClear = await invoke<boolean>("consume_ui_cleanup_flag");
    if (!shouldClear) return;

    // 清理 creatorai:* 前缀的 localStorage
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith("creatorai:")) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
    sessionStorage.clear();
  } catch {
    // ignore cleanup failures
  }
}

/**
 * 初始化全局错误处理
 */
export function setupGlobalErrorHandlers(): () => void {
  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    console.error("Unhandled promise rejection:", event.reason);
    message.error(`发生未处理异常：${formatError(event.reason)}`);
  };

  const onError = (event: ErrorEvent) => {
    if (!event.error && !event.message) return;
    console.error("Uncaught error:", event.error ?? event.message);
    message.error(`发生错误：${formatError(event.error ?? event.message)}`);
  };

  window.addEventListener("unhandledrejection", onUnhandledRejection);
  window.addEventListener("error", onError);

  return () => {
    window.removeEventListener("unhandledrejection", onUnhandledRejection);
    window.removeEventListener("error", onError);
  };
}

/**
 * 初始化保存状态监听
 */
export function setupSaveStatusListener(
  projectPath: string | null,
  onStatusChange: (hasChanges: boolean) => void
): () => void {
  const onSaveStatus = (event: Event) => {
    if (!projectPath) return;
    const { detail } = event as CustomEvent<{ projectPath: string; saveStatus: string }>;
    if (!detail || detail.projectPath !== projectPath) return;
    onStatusChange(detail.saveStatus !== "saved");
  };

  window.addEventListener("creatorai:saveStatus", onSaveStatus);
  return () => window.removeEventListener("creatorai:saveStatus", onSaveStatus);
}

/**
 * 初始化窗口关闭保护
 */
export async function setupWindowCloseGuard(
  hasUnsavedChanges: boolean,
  _onConfirm: () => Promise<boolean>
): Promise<() => void> {
  if (!isTauri()) return () => {};

  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const { confirm } = await import("@tauri-apps/plugin-dialog");

  let unlisten: (() => void) | null = null;

  try {
    unlisten = await getCurrentWindow().onCloseRequested(async (event) => {
      if (!hasUnsavedChanges) return;
      const confirmed = await confirm("你有未保存的更改，确定要退出吗？", {
        title: "确认退出",
        kind: "warning",
      });
      if (!confirmed) event.preventDefault();
    });
  } catch {
    // ignore
  }

  return () => {
    unlisten?.();
  };
}

/**
 * 应用引导主函数
 */
export async function bootstrapApp(): Promise<void> {
  await clearUiStateIfNeeded();
}
