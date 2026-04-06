/**
 * MainLayout - 主布局组件
 * 
 * 简化后的主布局，只负责组合各个面板组件
 */

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Button, Space, Typography } from "antd";
import { FolderOpenOutlined, PlusOutlined } from "@ant-design/icons";
import { ActivityBar } from "../components/ActivityBar";
import { AIPanel } from "../components/AIPanel";
import { Editor, type EditorHandle } from "../components/Editor";
import { KnowledgePanel } from "../components/Knowledge";
import { Sidebar } from "../components/Sidebar";
import { SettingsPanel } from "../components/Settings";
import { StatusBar } from "../components/StatusBar";
import ExportModal from "../components/Export/ExportModal";
import WorldbuildingPanel from "../components/Worldbuilding";
import { useLayoutManager } from "../hooks/useLayoutManager";
import { useChapterManager } from "../hooks/useChapterManager";
import type { Theme } from "../hooks/useTheme";
import { countWords } from "../utils/wordCount";
import "./main-layout.css";

export type SidebarView = "chapters" | "knowledge" | "settings" | "worldbuilding";

interface MainLayoutProps {
  projectPath: string;
  projectName: string;
  projectBusy?: boolean;
  theme: Theme;
  onToggleTheme: () => void;
  onCreateProject: () => void;
  onOpenProject: () => void;
  onCloseProject: () => void;
}

export default function MainLayout({
  projectPath,
  projectName,
  projectBusy,
  theme,
  onToggleTheme,
  onCreateProject,
  onOpenProject,
  onCloseProject,
}: MainLayoutProps) {
  const [sidebarView, setSidebarView] = useState<SidebarView>("chapters");
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const editorRef = useRef<EditorHandle | null>(null);

  // 布局管理
  const layout = useLayoutManager(projectPath);

  // 章节管理
  const chapter = useChapterManager(projectPath);

  // 独立的保存状态管理 - 直接从 Editor 同步
  const [editorSaveStatus, setEditorSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");

  // 统一保存状态：优先使用 Editor 的状态，如果没有则使用 chapter 的状态
  const saveStatus = chapter.saveStatus !== editorSaveStatus && editorSaveStatus !== "saved" 
    ? editorSaveStatus 
    : chapter.saveStatus;

  // 字数统计
  const chapterWordCount = useMemo(() => {
    if (!chapter.currentChapterId) return 0;
    return countWords(chapter.draftContent);
  }, [chapter.currentChapterId, chapter.draftContent]);

  const totalWordCount = useMemo(() => {
    if (!chapter.currentChapterId) {
      return chapter.chapters.reduce((sum: number, c: { wordCount?: number }) => sum + (c.wordCount || 0), 0);
    }
    return chapter.chapters.reduce((sum: number, c: { id: string; wordCount?: number }) => {
      if (c.id === chapter.currentChapterId) return sum + chapterWordCount;
      return sum + (c.wordCount || 0);
    }, 0);
  }, [chapter.chapters, chapter.currentChapterId, chapterWordCount]);

  const chapterTitle = useMemo(() => {
    if (!chapter.currentChapterId) return "未选择章节";
    return chapter.chapters.find((c: { id: string; title: string }) => c.id === chapter.currentChapterId)?.title ?? chapter.currentChapterId;
  }, [chapter.chapters, chapter.currentChapterId]);

  // 处理保存
  const handleSave = useCallback(
    async (content: string) => {
      await chapter.saveChapter(content);
    },
    [chapter],
  );

  // 处理草稿变化
  const handleDraftChange = useCallback(
    (content: string) => {
      chapter.setDraftContent(content);
    },
    [chapter],
  );

  // 处理保存状态变化 - 同步 Editor 的自动保存状态
  // 使用稳定的引用，避免依赖变化导致的重新渲染
  const handleSaveStatusChangeRef = useRef((status: "saved" | "saving" | "unsaved") => {
    setEditorSaveStatus(status);
    // 同时更新 chapter 的状态，保持一致性
    chapter.setSaveStatus(status);
  });

  // 监听章节切换 - 重置编辑器保存状态
  useEffect(() => {
    if (chapter.currentChapterId) {
      setEditorSaveStatus("saved");
    }
  }, [chapter.currentChapterId]);

  // 监听章节选择事件
  useEffect(() => {
    const onOpenSettings = (event: Event) => {
      const { detail } = event as CustomEvent<{ projectPath: string }>;
      if (!detail || detail.projectPath !== projectPath) return;
      setSidebarView("settings");
    };

    const onChaptersChanged = (event: Event) => {
      const { detail } = event as CustomEvent<{ projectPath: string }>;
      if (!detail || detail.projectPath !== projectPath) return;
      void chapter.refreshChapters();
    };

    window.addEventListener("creatorai:openSettings", onOpenSettings);
    window.addEventListener("creatorai:chaptersChanged", onChaptersChanged);
    return () => {
      window.removeEventListener("creatorai:openSettings", onOpenSettings);
      window.removeEventListener("creatorai:chaptersChanged", onChaptersChanged);
    };
  }, [projectPath, chapter]);

  // 是否为全屏模式（世界观编辑器等）
  const isFullscreenMode = sidebarView === "worldbuilding";

  return (
    <div
      className="main-layout"
      ref={layout.layoutRef}
      style={{
        ["--sidebar-width" as never]: isFullscreenMode ? "0px" : `${Math.max(0, layout.sidebarWidth)}px`,
        ["--ai-panel-width" as never]: isFullscreenMode ? "0px" : `${Math.max(0, layout.aiPanelWidth)}px`,
      }}
    >
      <ActivityBar
        activeView={sidebarView}
        onViewChange={(next) => {
          setSidebarView(next);
          // 世界观模式不需要展开侧边栏
          if (layout.sidebarCollapsed && next !== "worldbuilding") {
            layout.toggleSidebarCollapsed();
          }
        }}
        theme={theme}
        onToggleTheme={onToggleTheme}
      />

      {/* 全屏模式：世界观编辑器直接占满中间区域 */}
      {isFullscreenMode ? (
        <main className="editor-area" style={{ width: "100%" }}>
          <WorldbuildingPanel />
        </main>
      ) : (
        <>
          <aside className={layout.sidebarCollapsed ? "sidebar collapsed" : "sidebar"}>
            <div className="sidebar-header">
              <div className="sidebar-project-title">
                <Typography.Text strong>{projectName}</Typography.Text>
              </div>
              <Typography.Text type="secondary" className="sidebar-project-path">
                {projectPath}
              </Typography.Text>
              <Space size={8} className="sidebar-project-actions">
                <Button
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={onCreateProject}
                  disabled={projectBusy}
                >
                  新建
                </Button>
                <Button
                  size="small"
                  icon={<FolderOpenOutlined />}
                  onClick={onOpenProject}
                  disabled={projectBusy}
                >
                  打开
                </Button>
                <Button size="small" onClick={onCloseProject} disabled={projectBusy}>
                  关闭
                </Button>
              </Space>
            </div>

            <div className="sidebar-content">
              {sidebarView === "chapters" && <Sidebar projectPath={projectPath} />}
              {sidebarView === "knowledge" && <KnowledgePanel projectPath={projectPath} />}
              {sidebarView === "settings" && <SettingsPanel />}
            </div>
          </aside>

          <div
            className={`panel-resizer sidebar-resizer ${layout.dragging === "sidebar" ? "dragging" : ""}`}
            role="separator"
            aria-orientation="vertical"
            aria-label="调整侧边栏宽度"
            title="拖拽调整宽度，双击隐藏/显示"
            onPointerDown={layout.beginResizeSidebar}
            onDoubleClick={layout.toggleSidebarCollapsed}
          />

          <main className="editor-area">
            <Editor
              ref={editorRef}
              projectPath={projectPath}
              chapterId={chapter.currentChapterId}
              chapterTitle={chapterTitle}
              initialContent={chapter.chapterContent}
              onChange={handleDraftChange}
              onSave={handleSave}
              onSaveStatusChange={handleSaveStatusChangeRef.current}
            />
          </main>

          <div
            className={`panel-resizer ai-resizer ${layout.dragging === "ai" ? "dragging" : ""}`}
            role="separator"
            aria-orientation="vertical"
            aria-label="调整 AI 面板宽度"
            title="拖拽调整宽度，双击隐藏/显示"
            onPointerDown={layout.beginResizeAi}
            onDoubleClick={layout.toggleAiPanelCollapsed}
          />

          <aside className={layout.aiPanelCollapsed ? "ai-panel collapsed" : "ai-panel"}>
            <AIPanel projectPath={projectPath} />
          </aside>
        </>
      )}

      <div className="status-bar-container">
        <StatusBar
          chapterWordCount={chapterWordCount}
          totalWordCount={totalWordCount}
          saveStatus={saveStatus}
          projectPath={projectPath}
          chapterId={chapter.currentChapterId}
          chapterTitle={chapterTitle !== "未选择章节" ? chapterTitle : null}
          onExport={() => setExportModalOpen(true)}
        />
        <ExportModal
          projectPath={projectPath}
          currentChapterId={chapter.currentChapterId}
          currentChapterTitle={chapterTitle !== "未选择章节" ? chapterTitle : null}
          chapters={chapter.chapters.map((c: { id: string; title: string }) => ({
            id: c.id,
            title: c.title,
          }))}
          open={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
        />
      </div>
    </div>
  );
}
