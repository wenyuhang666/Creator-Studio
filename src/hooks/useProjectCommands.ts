/**
 * 项目生命周期 Hooks
 * 
 * 封装项目打开、创建、关闭等操作的逻辑
 */

import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { isTauri } from "@tauri-apps/api/core";
import { message } from "antd";
import { formatError } from "../utils/error";
import type { ProjectConfig, RecentProject } from "../app/types";
import { useAppStore } from "../app/store";

function joinPath(parent: string, child: string): string {
  const trimmedParent = parent.replace(/[\\/]+$/, "");
  const separator = trimmedParent.includes("\\") ? "\\" : "/";
  if (!trimmedParent) return child;
  return `${trimmedParent}${separator}${child}`;
}

/**
 * 项目操作相关 Tauri 命令封装
 */
export function useProjectCommands() {
  const { setCurrentProject, setRecentProjects, setProjectBusy } = useAppStore();

  const loadRecentProjects = useCallback(async () => {
    if (!isTauri()) {
      setRecentProjects([]);
      return;
    }
    try {
      const recent = (await invoke("get_recent_projects")) as RecentProject[];
      setRecentProjects(recent || []);
    } catch {
      setRecentProjects([]);
    }
  }, [setRecentProjects]);

  const openProject = useCallback(async (path: string) => {
    if (!path.trim()) return;

    setProjectBusy(true);
    message.loading({ content: "正在打开项目...", key: "project" });
    try {
      const config = (await invoke("open_project", { path })) as ProjectConfig;
      setCurrentProject({ path, name: config.name });
      await invoke("add_recent_project", { name: config.name, path });
      await loadRecentProjects();
      message.success({ content: `已打开项目：${config.name}`, key: "project" });
    } catch (error) {
      message.error({ content: `打开失败: ${formatError(error)}`, key: "project" });
    } finally {
      setProjectBusy(false);
    }
  }, [setCurrentProject, setProjectBusy, loadRecentProjects]);

  const createProject = useCallback(async (name: string, parentPath: string) => {
    const trimmedName = name.trim();
    const trimmedParent = parentPath.trim();
    if (!trimmedName || !trimmedParent) return;

    const folderName = trimmedName.replace(/[\\/]/g, "-");
    const projectPath = joinPath(trimmedParent, folderName);

    setProjectBusy(true);
    message.loading({ content: "正在创建项目...", key: "project" });
    try {
      const config = (await invoke("create_project", {
        path: projectPath,
        name: trimmedName,
      })) as ProjectConfig;
      setCurrentProject({ path: projectPath, name: config.name });
      await invoke("add_recent_project", { name: config.name, path: projectPath });
      await loadRecentProjects();
      message.success({ content: `项目已创建：${config.name}`, key: "project" });
    } catch (error) {
      message.error({ content: `创建失败: ${formatError(error)}`, key: "project" });
    } finally {
      setProjectBusy(false);
    }
  }, [setCurrentProject, setProjectBusy, loadRecentProjects]);

  const handleOpenProjectDialog = useCallback(async () => {
    try {
      let isTauriEnv = false;
      try {
        isTauriEnv = isTauri();
      } catch {
        isTauriEnv = false;
      }

      if (isTauriEnv) {
        const selected = await open({
          directory: true,
          multiple: false,
          title: "选择项目文件夹",
        });
        if (typeof selected === "string" && selected.trim()) {
          await openProject(selected);
        }
      } else {
        const userInput = prompt("当前为 Web 环境，请手动输入项目文件夹路径：");
        if (userInput && userInput.trim()) {
          await openProject(userInput.trim());
        }
      }
    } catch (error) {
      message.error(`打开失败: ${formatError(error)}`);
    }
  }, [openProject]);

  const closeProject = useCallback(() => {
    setCurrentProject(null);
  }, [setCurrentProject]);

  return {
    loadRecentProjects,
    openProject,
    createProject,
    handleOpenProjectDialog,
    closeProject,
  };
}
