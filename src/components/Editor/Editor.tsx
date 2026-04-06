import { Empty, message } from "antd";
import { invoke } from "@tauri-apps/api/core";
import { EditorSelection, EditorState, type Extension } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { history, historyKeymap, indentWithTab, redo, redoDepth, undo, undoDepth } from "@codemirror/commands";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ForwardedRef,
} from "react";
import type { SaveStatus } from "../StatusBar/StatusBar";
import { useBeforeUnload } from "../../hooks/useBeforeUnload";
import { countWords } from "../../utils/wordCount";
import { formatError } from "../../utils/error";
import { aiComplete } from "../../lib/ai";
import EditorHeader from "./EditorHeader";
import PolishToolbar from './PolishToolbar';
import "./editor.css";
import { useAutoSave } from "./useAutoSave";
import { createEditorTheme, getBackgroundStyles, getMarginLineStyle } from "./editorTheme";
import { firstLineIndentExtension } from "./firstLineIndent";
import { useEditorSettingsStore } from "../../features/settings/store/editorSettingsStore";
import {
  acceptInlineCompletion,
  clearInlineCompletion,
  getInlineCompletion,
  inlineCompletionField,
  inlineCompletionTheme,
  setInlineCompletion,
} from "./inlineCompletion";

export interface EditorHandle {
  saveNow: () => Promise<boolean>;
  hasUnsavedChanges: () => boolean;
  applyExternalAppend: (content: string) => void;
}

export interface EditorProps {
  projectPath: string;
  chapterId: string | null;
  chapterTitle: string;
  initialContent: string;
  disableInlineCompletion?: boolean;
  onChange: (content: string) => void;
  onSave: (content: string) => Promise<void>;
  onSaveStatusChange?: (status: SaveStatus) => void;
}

const saveErrorMessage = "保存失败，请稍后重试。";

function runSaveShortcut(save: () => Promise<void>) {
  void save().catch(() => {
    message.error(saveErrorMessage);
  });
}

function Editor({
  projectPath,
  chapterId,
  chapterTitle,
  initialContent,
  disableInlineCompletion = false,
  onChange,
  onSave,
  onSaveStatusChange,
}: EditorProps,
  ref: ForwardedRef<EditorHandle>,
) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const extensionsRef = useRef<Extension>([]);
  const lastSelectionRef = useRef<string>("");
  const [value, setValue] = useState(initialContent);
  const [canUndoState, setCanUndoState] = useState(false);
  const [canRedoState, setCanRedoState] = useState(false);
  const [selectionInfo, setSelectionInfo] = useState<{
    text: string;
    from: number;
    to: number;
    position: { top: number; left: number };
  } | null>(null);
  const completionTimerRef = useRef<number | null>(null);
  const completionSeqRef = useRef(0);
  const completingRef = useRef(false);
  const completionCacheRef = useRef<Map<string, { result: string; ts: number }>>(new Map());

  // 使用编辑器设置
  const editorSettings = useEditorSettingsStore((state) => state.settings);

  const { status, save, reset: resetAutoSave, hasUnsavedChanges } = useAutoSave(value, {
    delay: 2000,
    onSave,
  });
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  useBeforeUnload(hasUnsavedChanges);

  useImperativeHandle(
    ref,
    () => ({
      saveNow: async () => {
        if (!chapterId) return true;
        try {
          await save();
          return true;
        } catch {
          return false;
        }
      },
      hasUnsavedChanges: () => hasUnsavedChanges,
      applyExternalAppend: (content: string) => {
        if (!chapterId) return;
        if (!content) return;
        const view = viewRef.current;
        if (!view) return;
        view.dispatch({
          changes: { from: view.state.doc.length, insert: content },
          effects: clearInlineCompletion.of(null),
          scrollIntoView: true,
        });
      },
    }),
    [chapterId, hasUnsavedChanges],
  );

  useEffect(() => {
    onSaveStatusChange?.(status);
    // 广播章节保存状态，让 ChapterList 显示未保存图标
    if (chapterId) {
      window.dispatchEvent(
        new CustomEvent("creatorai:chapterSaveStatus", { 
          detail: { projectPath, chapterId, saveStatus: status } 
        }),
      );
    }
  }, [status, onSaveStatusChange, projectPath, chapterId]);

  useEffect(() => {
    onChange(value);
  }, [value, onChange]);

  useEffect(() => {
    if (!chapterId) {
      viewRef.current?.destroy();
      viewRef.current = null;
      if (completionTimerRef.current) window.clearTimeout(completionTimerRef.current);
      completionSeqRef.current += 1;
      completingRef.current = false;
      return;
    }

    const host = hostRef.current;
    if (!host) return;

    // Recreate editor per chapter for a clean undo stack.
    viewRef.current?.destroy();
    viewRef.current = null;

    const scheduleCompletion = (view: EditorView) => {
      if (completionTimerRef.current) window.clearTimeout(completionTimerRef.current);
      if (getInlineCompletion(view.state)) view.dispatch({ effects: clearInlineCompletion.of(null) });

      const selection = view.state.selection.main;
      if (!selection.empty) return;

      if (!disableInlineCompletion) {
        completionTimerRef.current = window.setTimeout(() => {
          void requestCompletion(view);
        }, 500);
      }
    };

    const requestCompletion = async (view: EditorView) => {
      const selection = view.state.selection.main;
      if (!selection.empty) return;

      const cursor = selection.head;
      const fullText = view.state.doc.toString();
      const before = fullText.slice(Math.max(0, cursor - 2200), cursor);
      const after = fullText.slice(cursor, Math.min(fullText.length, cursor + 300));
      if (!before.trim()) return;

      completingRef.current = true;
      const seq = (completionSeqRef.current += 1);

      // Check cache (last 200 chars of before as key, 30s TTL)
      const cacheKey = before.slice(-200);
      const cached = completionCacheRef.current.get(cacheKey);
      if (cached && Date.now() - cached.ts < 30_000) {
        if (completionSeqRef.current !== seq) return;
        if (viewRef.current !== view) return;
        const currentSel = view.state.selection.main;
        if (!currentSel.empty || currentSel.head !== cursor) return;
        view.dispatch({ effects: setInlineCompletion.of(cached.result) });
        completingRef.current = false;
        return;
      }

      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          window.setTimeout(() => reject(new Error("__timeout__")), 8_000),
        );
        const raw = await Promise.race([
          aiComplete({
            projectDir: projectPath,
            beforeText: before,
            afterText: after,
            maxChars: 180,
          }),
          timeoutPromise,
        ]);

        if (completionSeqRef.current !== seq) return;
        if (viewRef.current !== view) return;
        const currentSel = view.state.selection.main;
        if (!currentSel.empty || currentSel.head !== cursor) return;

        let text = (raw ?? "").replace(/^\uFEFF/, "");
        text = text.replace(/^<<<CONTINUE_DRAFT>>>\s*/m, "");
        text = text.replace(/^```[\s\S]*?```\s*/m, "");
        text = text.trimStart();
        text = text.replace(/\s+$/g, "");
        if (!text) return;

        const maxLen = 260;
        if (text.length > maxLen) text = text.slice(0, maxLen);

        completionCacheRef.current.set(cacheKey, { result: text, ts: Date.now() });
        view.dispatch({ effects: setInlineCompletion.of(text) });
      } catch (error) {
        if (completionSeqRef.current !== seq) return;
        const errText = formatError(error);
        if (/已停止生成|cancelled|canceled|aborted|取消/i.test(errText)) return;
        if (errText === "__timeout__" || /timeout/i.test(errText)) return;
        if (errText.includes("请先在设置") || errText.includes("Provider") || errText.includes("模型")) {
          message.warning("未配置 Provider/模型，无法使用补全。请先在设置里配置。");
        }
      } finally {
        if (completionSeqRef.current === seq) completingRef.current = false;
      }
    };

    const selectionListener = EditorView.updateListener.of((update) => {
      if (!update.selectionSet) return;
      const { from, to } = update.state.selection.main;
      const selectedText = update.state.doc.sliceString(from, to);
      if (selectedText.length >= 10) {
        const coords = update.view.coordsAtPos(from);
        if (coords) {
          const editorRect = update.view.dom.getBoundingClientRect();
          setSelectionInfo({
            text: selectedText,
            from,
            to,
            position: {
              top: coords.top - editorRect.top - 40,
              left: Math.max(0, coords.left - editorRect.left),
            },
          });
        }
      } else {
        setSelectionInfo(null);
      }
    });

    const extensions: Extension = [
      EditorView.lineWrapping,
      history(),
      inlineCompletionField,
      selectionListener,
      inlineCompletionTheme,
      // 空格键拦截 - 必须放在最前面，确保优先执行
      keymap.of([
        {
          key: "Mod-z",
          run: undo,
          preventDefault: true,
        },
        {
          key: "Mod-Shift-z",
          run: redo,
          preventDefault: true,
        },
        {
          win: "Ctrl-y",
          linux: "Ctrl-y",
          run: redo,
          preventDefault: true,
        },
        {
          key: "Mod-a",
          run: (view) => {
            view.dispatch({
              selection: EditorSelection.single(0, view.state.doc.length),
            });
            return true;
          },
          preventDefault: true,
        },
        {
          key: "Tab",
          run: (view) => {
            return acceptInlineCompletion(view);
          },
        },
        indentWithTab,
        {
          key: "Escape",
          run: (view) => {
            const suggestion = getInlineCompletion(view.state);
            if (!suggestion) return false;
            view.dispatch({ effects: clearInlineCompletion.of(null) });
            void invoke("ai_complete_cancel").catch(() => {});
            completionSeqRef.current += 1;
            completingRef.current = false;
            return true;
          },
        },
        {
          key: "Mod-s",
          run: () => {
            void saveRef.current().catch(() => {
              message.error("保存失败，请稍后重试。");
            });
            return true;
          },
        },
        {
          win: "Ctrl-Shift-s",
          linux: "Ctrl-Shift-s",
          run: () => {
            runSaveShortcut(saveRef.current);
            return true;
          },
        },
        ...historyKeymap,
      ]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const next = update.state.doc.toString();
          setValue(next);
        }

        if (update.docChanged || update.selectionSet) {
          const selection = update.state.selection.main;
          const selectedText = selection.empty
            ? ""
            : update.state.sliceDoc(selection.from, selection.to).slice(0, 4000);
          if (selectedText !== lastSelectionRef.current) {
            lastSelectionRef.current = selectedText;
            window.dispatchEvent(
              new CustomEvent("creatorai:editorSelection", {
                detail: { projectPath, chapterId, text: selectedText },
              }),
            );
          }

          scheduleCompletion(update.view);
        }

        setCanUndoState(undoDepth(update.state) > 0);
        setCanRedoState(redoDepth(update.state) > 0);
      }),
      // 动态编辑器主题
      createEditorTheme(editorSettings),
      // 首行缩进扩展
      firstLineIndentExtension(
        editorSettings.firstLineIndentEnabled,
        editorSettings.firstLineIndentChars,
        editorSettings.spaceWidthRatio
      ),
    ];
    extensionsRef.current = extensions;

    const view = new EditorView({
      state: EditorState.create({ doc: initialContent, extensions }),
      parent: host,
    });
    viewRef.current = view;
    setCanUndoState(undoDepth(view.state) > 0);
    setCanRedoState(redoDepth(view.state) > 0);

    // Initial completion.
    scheduleCompletion(view);

    return () => {
      completionSeqRef.current += 1;
      completingRef.current = false;
      if (completionTimerRef.current) window.clearTimeout(completionTimerRef.current);
      view.destroy();
      viewRef.current = null;
    };
  }, [chapterId, projectPath, disableInlineCompletion, editorSettings]);

  // 跟踪上一次的 chapterId 和 initialContent，用于检测变化
  const prevChapterIdRef = useRef(chapterId);
  const prevInitialContentRef = useRef(initialContent);

  useEffect(() => {
    if (!chapterId) return;
    
    const chapterChanged = prevChapterIdRef.current !== chapterId;
    const contentChanged = prevInitialContentRef.current !== initialContent;
    
    // 更新 refs
    prevChapterIdRef.current = chapterId;
    prevInitialContentRef.current = initialContent;
    
    if (chapterChanged) {
      // 章节切换，强制重置
      resetAutoSave(initialContent);
      setValue(initialContent);

      const view = viewRef.current;
      if (!view) return;
      view.setState(
        EditorState.create({
          doc: initialContent,
          extensions: extensionsRef.current,
        }),
      );
      setCanUndoState(undoDepth(view.state) > 0);
      setCanRedoState(redoDepth(view.state) > 0);
    } else if (contentChanged) {
      // initialContent 从外部更新（从服务器加载），同步更新编辑器
      // 不管 hasUnsavedChanges 是什么，只要内容真的变了就应该更新
      resetAutoSave(initialContent);
      setValue(initialContent);
      
      const view = viewRef.current;
      if (view) {
        view.setState(
          EditorState.create({
            doc: initialContent,
            extensions: extensionsRef.current,
          }),
        );
      }
    }
  }, [chapterId, initialContent, hasUnsavedChanges, resetAutoSave]);

  const prevStatusRef = useRef<SaveStatus>(status);
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;
    if (prev !== "saving" || status !== "saved") return;
    window.dispatchEvent(
      new CustomEvent("creatorai:chaptersChanged", { detail: { projectPath, reason: "save" } }),
    );
  }, [status, projectPath]);

  const wordCount = useMemo(() => countWords(value), [value]);

  if (!chapterId) {
    return (
      <div className="editor-empty">
        <Empty description="请选择或新建一个章节开始写作" />
      </div>
    );
  }

  return (
    <div className="editor-root">
      <EditorHeader
        title={chapterTitle}
        wordCount={wordCount}
        canUndo={canUndoState}
        canRedo={canRedoState}
        onUndo={() => {
          const view = viewRef.current;
          if (view) undo(view);
        }}
        onRedo={() => {
          const view = viewRef.current;
          if (view) redo(view);
        }}
      />
      <div
        ref={hostRef}
        className={`editor-codemirror ${editorSettings.fixedLineWidthEnabled ? 'fixed-line-width' : ''}`}
        style={{
          ...getBackgroundStyles(editorSettings),
          // 传递行宽给 CSS
          ...(editorSettings.fixedLineWidthEnabled && {
            '--editor-line-width': `${editorSettings.lineWidth}ch`,
          } as React.CSSProperties),
          position: 'relative',
        }}
      >
        {/* 右边距指示线 */}
        {editorSettings.fixedLineWidthEnabled && editorSettings.showMarginLine && (
          <div style={getMarginLineStyle(editorSettings) || {}} />
        )}
        {selectionInfo && (
          <PolishToolbar
            selectedText={selectionInfo.text}
            position={selectionInfo.position}
            onApply={(newText) => {
              const view = viewRef.current;
              if (view && selectionInfo) {
                view.dispatch({
                  changes: { from: selectionInfo.from, to: selectionInfo.to, insert: newText },
                });
                setSelectionInfo(null);
              }
            }}
            onDismiss={() => setSelectionInfo(null)}
          />
        )}
      </div>
    </div>
  );
}

const ForwardEditor = forwardRef<EditorHandle, EditorProps>(Editor);
ForwardEditor.displayName = "Editor";
export default ForwardEditor;
