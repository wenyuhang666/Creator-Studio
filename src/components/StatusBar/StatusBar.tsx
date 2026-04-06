import { CheckCircleOutlined, SyncOutlined, FolderOpenOutlined, DownloadOutlined } from "@ant-design/icons";
import type { ReactNode } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { message } from "antd";
import { formatError } from "../../utils/error";
import "./status-bar.css";

export type SaveStatus = "saved" | "saving" | "unsaved";

interface StatusBarProps {
  chapterWordCount: number;
  totalWordCount: number;
  saveStatus: SaveStatus;
  projectPath?: string;
  chapterId?: string | null;
  chapterTitle?: string | null;
  onExport?: () => void;
}

export default function StatusBar({ 
  chapterWordCount, 
  totalWordCount, 
  saveStatus,
  projectPath,
  chapterId,
  chapterTitle,
  onExport,
}: StatusBarProps) {
  const isDesktop = isTauri();
  const canOpenFolder = isDesktop && !!projectPath && !!chapterId;
  const canExport = !!chapterId; // 导出按钮在桌面版和网页版都可用

  const statusIcon = {
    saved: <CheckCircleOutlined className="status-icon status-icon-saved" />,
    saving: <SyncOutlined spin className="status-icon status-icon-saving" />,
    unsaved: <span className="status-icon status-icon-unsaved">●</span>,
  } satisfies Record<SaveStatus, ReactNode>;

  const statusText = {
    saved: "已保存",
    saving: "保存中...",
    unsaved: "未保存",
  } satisfies Record<SaveStatus, string>;

  const handleOpenFolder = async () => {
    if (!projectPath || !chapterId) {
      message.info("请先打开一个章节");
      return;
    }
    try {
      await invoke("open_chapter_folder", { projectPath, chapterId });
    } catch (error) {
      message.error(`打开文件夹失败: ${formatError(error)}`);
    }
  };

  const handleExport = () => {
    if (!chapterId) {
      message.info("请先选择一个章节");
      return;
    }
    onExport?.();
  };
  
  return (
    <div className="status-bar">
      <div className="status-item">本章：{chapterWordCount.toLocaleString()} 字</div>
      <div className="status-divider">|</div>
      <div className="status-item">全书：{totalWordCount.toLocaleString()} 字</div>
      <div className="status-divider">|</div>
      <div className="status-item status-save">
        {statusIcon[saveStatus]} {statusText[saveStatus]}
      </div>
      <div className="status-divider">|</div>
      <div className="status-item status-actions">
        <button 
          className="status-button status-button-primary"
          onClick={handleExport}
          disabled={!canExport}
          title={chapterTitle ? `导出「${chapterTitle}」` : "导出章节"}
        >
          <DownloadOutlined /> 导出
        </button>
        <button 
          className="status-button"
          onClick={handleOpenFolder}
          disabled={!canOpenFolder}
          title={canOpenFolder ? `在文件管理器中显示「${chapterTitle || chapterId}」` : "请先打开一个章节"}
        >
          <FolderOpenOutlined /> 打开文件夹
        </button>
      </div>
    </div>
  );
}
