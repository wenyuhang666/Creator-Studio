/**
 * 章节管理 Hook
 * 
 * 封装章节加载、保存、切换等操作
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { message } from "antd";
import { formatError } from "../utils/error";

export interface ChapterMeta {
  id: string;
  title: string;
  order: number;
  created: number;
  updated: number;
  wordCount: number;
}

function currentChapterStorageKey(projectPath: string): string {
  return `creatorai:currentChapter:${encodeURIComponent(projectPath)}`;
}

export interface ChapterState {
  chapters: ChapterMeta[];
  currentChapterId: string | null;
  chapterContent: string;
  draftContent: string;
  saveStatus: "saved" | "saving" | "unsaved";
}

export interface ChapterActions {
  refreshChapters: () => Promise<void>;
  selectChapter: (chapterId: string | null) => void;
  loadChapterContent: (chapterId: string) => Promise<void>;
  saveChapter: (content: string) => Promise<void>;
  setDraftContent: (content: string) => void;
}

export function useChapterManager(
  projectPath: string,
  onContentChange?: (content: string) => void
): ChapterState & ChapterActions {
  const [chapters, setChapters] = useState<ChapterMeta[]>([]);
  const [currentChapterId, setCurrentChapterId] = useState<string | null>(null);
  const [chapterContent, setChapterContent] = useState("");
  const [draftContent, setDraftContentState] = useState("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const contentLoadTokenRef = useRef(0);

  // 刷新章节列表
  const refreshChapters = useCallback(async () => {
    try {
      const result = (await invoke("list_chapters", {
        projectPath,
      })) as ChapterMeta[];
      const next = (result || []).slice().sort((a, b) => a.order - b.order);
      setChapters(next);

      const stored = localStorage.getItem(currentChapterStorageKey(projectPath));
      const storedValid = stored && next.some((c) => c.id === stored);
      const fallbackId = next[0]?.id ?? null;

      setCurrentChapterId((prev) => {
        if (prev && next.some((c) => c.id === prev)) return prev;
        return storedValid ? stored : fallbackId;
      });
    } catch {
      setChapters([]);
      setCurrentChapterId(null);
    }
  }, [projectPath]);

  // 加载章节内容
  const loadChapterContent = useCallback(async (chapterId: string) => {
    const token = (contentLoadTokenRef.current += 1);
    try {
      const content = (await invoke("get_chapter_content", {
        projectPath,
        chapterId,
      })) as string;
      if (contentLoadTokenRef.current !== token) return;
      setChapterContent(content ?? "");
      setDraftContentState(content ?? "");
      onContentChange?.(content ?? "");
      setSaveStatus("saved");
    } catch (error) {
      if (contentLoadTokenRef.current !== token) return;
      setChapterContent("");
      setDraftContentState("");
      onContentChange?.("");
      message.error(`加载章节内容失败: ${formatError(error)}`);
    }
  }, [projectPath, onContentChange]);

  // 选择章节
  const selectChapter = useCallback((chapterId: string | null) => {
    setCurrentChapterId(chapterId);
    if (chapterId) {
      localStorage.setItem(currentChapterStorageKey(projectPath), chapterId);
    }
  }, [projectPath]);

  // 保存章节
  const saveChapter = useCallback(async (content: string) => {
    if (!currentChapterId) return;
    setSaveStatus("saving");
    try {
      await invoke("save_chapter_content", {
        projectPath,
        chapterId: currentChapterId,
        content,
      });
      setChapterContent(content);
      setDraftContentState(content);
      onContentChange?.(content);
      setSaveStatus("saved");

      // 广播保存状态
      window.dispatchEvent(
        new CustomEvent("creatorai:saveStatus", {
          detail: { projectPath, saveStatus: "saved" },
        }),
      );
    } catch (error) {
      setSaveStatus("unsaved");
      message.error(`保存失败: ${formatError(error)}`);
    }
  }, [projectPath, currentChapterId, onContentChange]);

  // 更新草稿内容
  const setDraftContent = useCallback((content: string) => {
    setDraftContentState(content);
    setSaveStatus("unsaved");
  }, []);

  // 初始化加载章节
  useEffect(() => {
    void refreshChapters();
  }, [refreshChapters]);

  // 当章节 ID 变化时加载内容
  useEffect(() => {
    if (currentChapterId) {
      void loadChapterContent(currentChapterId);
    } else {
      setChapterContent("");
      setDraftContentState("");
      onContentChange?.("");
    }
  }, [currentChapterId, loadChapterContent, onContentChange]);

  return {
    // State
    chapters,
    currentChapterId,
    chapterContent,
    draftContent,
    saveStatus,
    // Actions
    refreshChapters,
    selectChapter,
    loadChapterContent,
    saveChapter,
    setDraftContent,
  };
}
