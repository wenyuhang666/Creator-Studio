import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button, Input, Modal, message } from "antd";
import { ImportOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import ChapterItem, { type ChapterMeta } from "./ChapterItem";
import ChapterSummary from "./ChapterSummary";
import ImportModal from "../Project/ImportModal";
import "../../styles/sidebar.css";
import { formatError } from "../../utils/error";

interface ChapterListProps {
  projectPath: string;
}

function currentChapterStorageKey(projectPath: string) {
  return `creatorai:currentChapter:${encodeURIComponent(projectPath)}`;
}

export default function ChapterList({ projectPath }: ChapterListProps) {
  const [chapters, setChapters] = useState<ChapterMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentChapterId, setCurrentChapterId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const selectionCauseRef = useRef<"user" | "create" | "delete" | "load">("load");
  
  // 未保存章节 ID（当用户点击其他章节时，如果当前章节有未保存的更改，存储目标章节 ID）
  const pendingChapterIdRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
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
        const resolved = prev && next.some((c) => c.id === prev) ? prev : storedValid ? stored : fallbackId;
        if (resolved !== prev) selectionCauseRef.current = "load";
        return resolved;
      });
    } catch (error) {
      message.error(`加载章节失败: ${formatError(error)}`);
      setChapters([]);
      setCurrentChapterId(null);
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onChaptersChanged = (event: Event) => {
      const { detail } = event as CustomEvent<{ projectPath: string }>;
      if (!detail || detail.projectPath !== projectPath) return;
      void load();
    };

    window.addEventListener("creatorai:chaptersChanged", onChaptersChanged);
    return () => window.removeEventListener("creatorai:chaptersChanged", onChaptersChanged);
  }, [projectPath, load]);

  useEffect(() => {
    const onForceSelection = (event: Event) => {
      const { detail } = event as CustomEvent<{ projectPath: string; chapterId: string | null }>;
      if (!detail || detail.projectPath !== projectPath) return;
      selectionCauseRef.current = "load";
      setCurrentChapterId(detail.chapterId);
    };

    window.addEventListener("creatorai:forceChapterSelection", onForceSelection);
    return () => window.removeEventListener("creatorai:forceChapterSelection", onForceSelection);
  }, [projectPath]);

  // 监听保存状态变化 - 用于显示未保存图标
  const [unsavedChapterId, setUnsavedChapterId] = useState<string | null>(null);
  const [confirmSwitchOpen, setConfirmSwitchOpen] = useState(false);
  
  useEffect(() => {
    const onSaveStatusChange = (event: Event) => {
      const { detail } = event as CustomEvent<{ projectPath: string; chapterId: string; saveStatus: string }>;
      if (!detail || detail.projectPath !== projectPath) return;
      // 只有当是当前章节时，才更新未保存状态
      if (detail.chapterId === currentChapterId) {
        setUnsavedChapterId(detail.saveStatus === "unsaved" ? detail.chapterId : null);
      }
    };

    window.addEventListener("creatorai:chapterSaveStatus", onSaveStatusChange);
    return () => window.removeEventListener("creatorai:chapterSaveStatus", onSaveStatusChange);
  }, [projectPath, currentChapterId]);

  // 处理章节点击 - 检查未保存内容
  const handleChapterClick = (chapterId: string) => {
    if (chapterId === currentChapterId) return;
    
    // 如果当前章节有未保存的更改，弹出确认对话框
    if (unsavedChapterId && unsavedChapterId === currentChapterId) {
      pendingChapterIdRef.current = chapterId;
      setConfirmSwitchOpen(true);
      return;
    }
    
    selectionCauseRef.current = "user";
    setCurrentChapterId(chapterId);
  };

  // 确认切换 - 直接切换，放弃未保存内容
  const handleConfirmSwitch = () => {
    setConfirmSwitchOpen(false);
    if (pendingChapterIdRef.current) {
      selectionCauseRef.current = "user";
      setCurrentChapterId(pendingChapterIdRef.current);
      pendingChapterIdRef.current = null;
    }
  };

  // 取消切换
  const handleCancelSwitch = () => {
    setConfirmSwitchOpen(false);
    pendingChapterIdRef.current = null;
  };

  useEffect(() => {
    const key = currentChapterStorageKey(projectPath);
    const cause = selectionCauseRef.current;
    selectionCauseRef.current = "user";

    if (!currentChapterId) {
      localStorage.removeItem(key);
      window.dispatchEvent(
        new CustomEvent("creatorai:chapterSelected", {
          detail: { projectPath, chapterId: null, cause },
        }),
      );
      return;
    }

    localStorage.setItem(key, currentChapterId);
    window.dispatchEvent(
      new CustomEvent("creatorai:chapterSelected", {
        detail: { projectPath, chapterId: currentChapterId, cause },
      }),
    );
  }, [currentChapterId, projectPath]);

  const handleCreate = async () => {
    const title = createTitle.trim();
    if (!title) {
      message.error("请输入章节标题");
      return;
    }

    setCreating(true);
    try {
      const created = (await invoke("create_chapter", {
        projectPath,
        title,
      })) as ChapterMeta;
      message.success("章节已创建");
      setCreateOpen(false);
      setCreateTitle("");
      await load();
      selectionCauseRef.current = "create";
      setCurrentChapterId(created.id);
      window.dispatchEvent(
        new CustomEvent("creatorai:chaptersChanged", { detail: { projectPath, reason: "create" } }),
      );
    } catch (error) {
      message.error(`创建失败: ${formatError(error)}`);
    } finally {
      setCreating(false);
    }
  };

  const handleRename = async (chapterId: string, newTitle: string) => {
    try {
      await invoke("rename_chapter", {
        projectPath,
        chapterId,
        newTitle,
      });
      setChapters((prev) => prev.map((c) => (c.id === chapterId ? { ...c, title: newTitle } : c)));
      message.success("已重命名");
      window.dispatchEvent(
        new CustomEvent("creatorai:chaptersChanged", { detail: { projectPath, reason: "rename" } }),
      );
    } catch (error) {
      message.error(`重命名失败: ${formatError(error)}`);
    }
  };

  const handleDelete = async (chapterId: string) => {
    try {
      await invoke("delete_chapter", {
        projectPath,
        chapterId,
      });
      message.success("已删除");
      setChapters((prev) => {
        const remaining = prev.filter((c) => c.id !== chapterId);
        setCurrentChapterId((prevId) =>
          prevId === chapterId
            ? (() => {
                selectionCauseRef.current = "delete";
                return remaining[0]?.id ?? null;
              })()
            : prevId,
        );
        return remaining;
      });
      window.dispatchEvent(
        new CustomEvent("creatorai:chaptersChanged", { detail: { projectPath, reason: "delete" } }),
      );
    } catch (error) {
      message.error(`删除失败: ${formatError(error)}`);
    }
  };

  const openCreate = () => {
    setCreateTitle(`第${chapters.length + 1}章`);
    setCreateOpen(true);
  };

  return (
    <div className="chapter-list">
      <div className="chapter-list-header">
        <span>章节列表</span>
        <div>
          <Button
            type="text"
            icon={<ReloadOutlined />}
            onClick={() => void load()}
            title="刷新"
          />
          <Button
            type="text"
            icon={<ImportOutlined />}
            onClick={() => setImportOpen(true)}
            title="导入 TXT"
          />
          <Button
            type="text"
            icon={<PlusOutlined />}
            onClick={openCreate}
            title="新建章节"
          />
        </div>
      </div>

      <div className="chapter-list-body">
        {loading ? (
          <div style={{ padding: 12, color: "var(--text-secondary)" }}>加载中...</div>
        ) : chapters.length ? (
          chapters.map((chapter) => (
            <ChapterItem
              key={chapter.id}
              chapter={chapter}
              isActive={chapter.id === currentChapterId}
              onSelect={() => handleChapterClick(chapter.id)}
              onRename={(newTitle) => void handleRename(chapter.id, newTitle)}
              onDelete={() => void handleDelete(chapter.id)}
            />
          ))
        ) : (
          <div style={{ padding: 12, color: "var(--text-secondary)" }}>
            暂无章节，点击右上角 + 新建
          </div>
        )}
      </div>

      <ChapterSummary
        projectPath={projectPath}
        chapterId={currentChapterId}
        chapterTitle={chapters.find((c) => c.id === currentChapterId)?.title ?? null}
      />

      {/* 未保存内容确认对话框 */}
      <Modal
        title="⚠️ 有未保存的内容"
        open={confirmSwitchOpen}
        onCancel={handleCancelSwitch}
        footer={[
          <Button key="cancel" onClick={handleCancelSwitch}>
            取消
          </Button>,
          <Button key="discard" danger onClick={handleConfirmSwitch}>
            不保存，直接切换
          </Button>,
        ]}
      >
        <p>当前章节有未保存的更改。</p>
        <p>如果直接切换，未保存的内容将会丢失！</p>
      </Modal>

      <Modal
        title="新建章节"
        open={createOpen}
        onCancel={() => {
          if (creating) return;
          setCreateOpen(false);
        }}
        onOk={() => void handleCreate()}
        okText="创建"
        cancelText="取消"
        confirmLoading={creating}
        destroyOnClose
      >
        <Input
          value={createTitle}
          onChange={(e) => setCreateTitle(e.target.value)}
          placeholder="章节标题"
          onPressEnter={() => void handleCreate()}
          autoFocus
        />
      </Modal>

      <ImportModal
        visible={importOpen}
        projectPath={projectPath}
        onCancel={() => setImportOpen(false)}
        onSuccess={() => {
          setImportOpen(false);
          void load();
        }}
      />
    </div>
  );
}
