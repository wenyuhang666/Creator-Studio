/**
 * ExportModal - 导出对话框组件
 * 
 * 支持导出单个章节或批量导出所有章节为 TXT 文件
 */

import { useState } from "react";
import { Modal, Radio, message, Spin } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { invoke } from "@tauri-apps/api/core";
import { save, open as openDialog } from "@tauri-apps/plugin-dialog";

export interface ExportModalProps {
  /** 项目路径 */
  projectPath: string;
  /** 当前章节 ID（可选） */
  currentChapterId: string | null;
  /** 当前章节标题 */
  currentChapterTitle: string | null;
  /** 所有章节列表 */
  chapters: Array<{ id: string; title: string }>;
  /** 是否打开对话框 */
  open: boolean;
  /** 关闭对话框回调 */
  onClose: () => void;
}

type ExportMode = "single" | "all";

export default function ExportModal({
  projectPath,
  currentChapterId,
  currentChapterTitle,
  chapters,
  open,
  onClose,
}: ExportModalProps) {
  const [exportMode, setExportMode] = useState<ExportMode>("single");
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    try {
      setLoading(true);

      if (exportMode === "single") {
        // 导出单个章节
        if (!currentChapterId) {
          message.warning("请先选择一个章节");
          return;
        }

        // 打开文件夹选择对话框
        const selected = await save({
          title: "导出章节",
          defaultPath: `${currentChapterTitle || "章节"}.txt`,
          filters: [{ name: "文本文件", extensions: ["txt"] }],
        });

        if (!selected) {
          // 用户取消选择
          return;
        }

        const result = await invoke<string>("export_chapter", {
          projectPath,
          chapterId: currentChapterId,
          outputPath: selected,
        });

        message.success(`已导出到: ${result}`);
        onClose();
      } else {
        // 批量导出所有章节
        if (chapters.length === 0) {
          message.warning("没有可导出的章节");
          return;
        }

        // 打开文件夹选择对话框
        const selected = await openDialog({
          title: "选择导出文件夹",
          directory: true,
        });

        if (!selected) {
          // 用户取消选择
          return;
        }

        const results = await invoke<string[]>("export_all_chapters", {
          projectPath,
          outputDir: selected,
        });

        message.success(`已导出 ${results.length} 个章节`);
        onClose();
      }
    } catch (error) {
      message.error(`导出失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <span>
          <DownloadOutlined style={{ marginRight: 8 }} />
          导出为 TXT
        </span>
      }
      open={open}
      onCancel={onClose}
      onOk={handleExport}
      confirmLoading={loading}
      okText="导出"
      cancelText="取消"
      destroyOnClose
    >
      <div style={{ padding: "16px 0" }}>
        <Radio.Group
          value={exportMode}
          onChange={(e) => setExportMode(e.target.value)}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <Radio value="single">
            <div>
              <div style={{ fontWeight: 500 }}>导出当前章节</div>
              <div style={{ color: "#888", fontSize: 12 }}>
                {currentChapterTitle
                  ? `「${currentChapterTitle}」`
                  : "（未选择章节）"}
              </div>
            </div>
          </Radio>
          <Radio value="all">
            <div>
              <div style={{ fontWeight: 500 }}>导出所有章节</div>
              <div style={{ color: "#888", fontSize: 12 }}>
                共 {chapters.length} 个章节
              </div>
            </div>
          </Radio>
        </Radio.Group>

        {loading && (
          <div
            style={{
              textAlign: "center",
              padding: "20px 0",
            }}
          >
            <Spin tip="正在导出..." />
          </div>
        )}

        <div
          style={{
            marginTop: 16,
            padding: "12px",
            background: "#f5f5f5",
            borderRadius: 6,
            fontSize: 12,
            color: "#666",
          }}
        >
          导出的文件将保存为 UTF-8 编码的 TXT 格式
        </div>
      </div>
    </Modal>
  );
}
