import { useCallback, useEffect, useRef, useState } from "react";
import type { SaveStatus } from "../StatusBar/StatusBar";

interface UseAutoSaveOptions {
  delay?: number;
  onSave: (content: string) => Promise<void>;
}

export function useAutoSave(content: string, { delay = 2000, onSave }: UseAutoSaveOptions) {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [lastSavedContent, setLastSavedContent] = useState(content);
  const timerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  
  // 跟踪初始加载状态：避免首次加载时误判为"未保存"
  const isInitializedRef = useRef(false);
  
  // 监听 content 变化，同步 lastSavedContent
  useEffect(() => {
    // 首次加载（content 有内容但 lastSavedContent 为空）
    if (!isInitializedRef.current && content && !lastSavedContent) {
      setLastSavedContent(content);
      setStatus("saved");
      isInitializedRef.current = true;
      return;
    }
    
    // 标记已初始化
    isInitializedRef.current = true;
    
    // 内容变化检测
    if (content !== lastSavedContent) {
      setStatus("unsaved");
    }
  }, [content, lastSavedContent]);

  useEffect(() => {
    if (content === lastSavedContent) return;

    if (timerRef.current) window.clearTimeout(timerRef.current);

    timerRef.current = window.setTimeout(async () => {
      if (isSavingRef.current) return;

      isSavingRef.current = true;
      setStatus("saving");
      try {
        await onSave(content);
        setLastSavedContent(content);
        setStatus("saved");
      } catch {
        setStatus("unsaved");
      } finally {
        isSavingRef.current = false;
      }
    }, delay) as unknown as ReturnType<typeof window.setTimeout>;

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [content, lastSavedContent, delay, onSave]);

  const save = useCallback(async () => {
    if (content === lastSavedContent) return;
    if (isSavingRef.current) return;

    if (timerRef.current) window.clearTimeout(timerRef.current);

    isSavingRef.current = true;
    setStatus("saving");
    try {
      await onSave(content);
      setLastSavedContent(content);
      setStatus("saved");
    } catch (error) {
      setStatus("unsaved");
      throw error;
    } finally {
      isSavingRef.current = false;
    }
  }, [content, lastSavedContent, onSave]);

  const reset = useCallback((newContent: string) => {
    setLastSavedContent(newContent);
    setStatus("saved");
  }, []);

  return {
    status,
    save,
    reset,
    hasUnsavedChanges: content !== lastSavedContent,
  };
}

