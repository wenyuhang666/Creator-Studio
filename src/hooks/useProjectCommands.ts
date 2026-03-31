/**
 * 项目生命周期 Hooks
 * 
 * 封装项目打开、创建、关闭等操作的逻辑
 */

import { useCallback, useEffect, useState } from "react";
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

// ==================== 网页版模拟项目系统 ====================

const WEB_PROJECT_KEY = "creator-web-demo-project";
const WEB_RECENT_KEY = "creator-web-recent-projects";

interface WebChapter {
  id: string;
  title: string;
  content: string;
  order: number;
  created: number;
  updated: number;
}

interface WebProjectData {
  name: string;
  path: string;
  chapters: WebChapter[];
  created: number;
  updated: number;
}

function createWebDemoProject(): WebProjectData {
  return {
    name: "演示项目",
    path: "web-demo://演示项目",
    chapters: [
      {
        id: "chapter-1",
        title: "第一章：开始",
        content: "这是一个演示章节的内容。在网页版中，您可以体验世界观编辑器的功能。\n\n人物、势力和时间线数据会保存在本地存储中。",
        order: 0,
        created: Date.now(),
        updated: Date.now(),
      },
      {
        id: "chapter-2",
        title: "第二章：发展",
        content: "继续编写您的故事...",
        order: 1,
        created: Date.now(),
        updated: Date.now(),
      },
    ],
    created: Date.now(),
    updated: Date.now(),
  };
}

function getWebRecentProjects(): RecentProject[] {
  try {
    const stored = localStorage.getItem(WEB_RECENT_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}
  return [];
}

function addWebRecentProject(name: string, path: string): void {
  try {
    const recent = getWebRecentProjects().filter((p) => p.path !== path);
    recent.unshift({ name, path, lastOpened: Date.now() });
    localStorage.setItem(WEB_RECENT_KEY, JSON.stringify(recent.slice(0, 10)));
  } catch {}
}

function getWebProjectData(): WebProjectData | null {
  try {
    const stored = localStorage.getItem(WEB_PROJECT_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}
  return null;
}

function setWebProjectData(data: WebProjectData): void {
  try {
    localStorage.setItem(WEB_PROJECT_KEY, JSON.stringify(data));
  } catch {}
}

// ==================== 项目操作相关 Tauri 命令封装 ====================

export function useProjectCommands() {
  const { setCurrentProject, setRecentProjects, setProjectBusy } = useAppStore();
  const [webProjectData, setWebProjectDataState] = useState<WebProjectData | null>(null);

  // 初始化网页版项目数据
  useEffect(() => {
    const data = getWebProjectData();
    if (data) {
      setWebProjectDataState(data);
    }
  }, []);

  const loadRecentProjects = useCallback(async () => {
    if (!isTauri()) {
      setRecentProjects(getWebRecentProjects());
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
      // 检查是否为网页版演示项目
      if (path.startsWith("web-demo://")) {
        let data = getWebProjectData();
        if (!data) {
          data = createWebDemoProject();
          setWebProjectData(data);
        }
        setWebProjectDataState(data);
        setCurrentProject({ path, name: data.name });
        addWebRecentProject(data.name, path);
        message.success({ content: `已打开项目：${data.name}`, key: "project" });
      } else if (isTauri()) {
        const config = (await invoke("open_project", { path })) as ProjectConfig;
        setCurrentProject({ path, name: config.name });
        await invoke("add_recent_project", { name: config.name, path });
        await loadRecentProjects();
        message.success({ content: `已打开项目：${config.name}`, key: "project" });
      } else {
        throw new Error("非 Tauri 环境不支持打开本地项目");
      }
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
      if (isTauri()) {
        const config = (await invoke("create_project", {
          path: projectPath,
          name: trimmedName,
        })) as ProjectConfig;
        setCurrentProject({ path: projectPath, name: config.name });
        await invoke("add_recent_project", { name: config.name, path: projectPath });
        await loadRecentProjects();
        message.success({ content: `项目已创建：${config.name}`, key: "project" });
      } else {
        // 网页版创建模拟项目
        const data: WebProjectData = {
          name: trimmedName,
          path: `web-demo://${trimmedName}`,
          chapters: [
            {
              id: "chapter-1",
              title: "第一章",
              content: "",
              order: 0,
              created: Date.now(),
              updated: Date.now(),
            },
          ],
          created: Date.now(),
          updated: Date.now(),
        };
        setWebProjectData(data);
        setWebProjectDataState(data);
        setCurrentProject({ path: data.path, name: data.name });
        addWebRecentProject(data.name, data.path);
        message.success({ content: `项目已创建：${data.name}`, key: "project" });
      }
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
        // 网页版：显示选项让用户选择
        const action = window.confirm(
          "当前为网页版环境。\n\n点击「确定」打开演示项目体验完整功能。\n点击「取消」手动输入项目路径（需要有效的 Creator 项目目录）。"
        );
        
        if (action) {
          // 打开演示项目
          await openProject("web-demo://演示项目");
        } else {
          const userInput = prompt("请输入 Creator 项目文件夹路径：");
          if (userInput && userInput.trim()) {
            await openProject(userInput.trim());
          }
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
    webProjectData,
  };
}
