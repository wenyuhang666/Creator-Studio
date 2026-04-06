const fs = require('fs');
const path = 'test-suite/docs/text-storage-architecture.md';

const content = \# 墨灵（桌宠化AI写作助手）文本编辑与文件存储架构设计

## 1. 当前架构分析

### 1.1 项目概述

| 项目信息 | 说明 |
|---------|------|
| 项目名称 | Creator Studio（墨灵桌宠核心） |
| 技术栈 | React + TypeScript（前端）+ Rust + Tauri（后端） |
| 项目路径 | c:\\Users\\16053\\proj\\07-story\\Creator-Studio |

### 1.2 现有架构组件

- **前端（React）**：Editor.tsx、useAutoSave.ts、useChapterManager.ts、StatusBar.tsx
- **后端（Rust + Tauri）**：chapter.rs、file_ops/write.rs、write_protection.rs

### 1.3 现有模块职责

| 模块 | 位置 | 职责 | 现状 |
|-----|------|------|------|
| Editor | src/components/Editor/Editor.tsx | 文本编辑界面，使用 CodeMirror | 正常运行 |
| useAutoSave | src/components/Editor/useAutoSave.ts | 自动保存逻辑，2秒延迟防抖 | 状态同步待优化 |
| useChapterManager | src/hooks/useChapterManager.ts | 章节 CRUD 状态管理 | 存在双状态源 |
| chapter.rs | src-tauri/src/chapter.rs | 后端章节管理命令 | 核心功能完整 |
| write_protection.rs | src-tauri/src/write_protection.rs | 原子写入+备份机制 | 健壮 |
| StatusBar | src/components/StatusBar/StatusBar.tsx | 保存指示灯显示 | 状态显示异常 |

### 1.4 核心问题分析

#### 问题 1: 文本保存功能架构不完善

当前流程存在以下问题：
- 保存成功后状态更新时序与 saveStatus 更新存在竞态
- 当 chapterId 变化时，useAutoSave 的 reset 可能未被正确调用
- useAutoSave 与 useChapterManager 存在双重状态管理

#### 问题 2: 缺少文件导出功能

| 需求 | 当前状态 |
|-----|---------|
| 导出为 TXT | 不支持 |
| 导出为 Word (.docx) | 不支持 |
| 导出为 PDF | 不支持 |
| 批量导出 | 不支持 |

#### 问题 3: 保存指示灯状态异常

useAutoSave.ts 的状态机问题：
- 状态: saved | saving | unsaved
- 触发条件不清晰，可能存在竞态条件
- 快速切换章节时，旧保存请求可能覆盖状态

### 1.5 当前文件系统结构

\\\\\\\\\
project_dir/
 .creatorai/config.json          # 项目配置
 chapters/
    index.json                  # 章节索引
    chapter_001.txt            # 章节内容
    chapter_002.txt
 .backup/                        # 备份目录
\\\\\\\\\

---

## 2. 目标架构设计

### 2.1 整体架构

前端（React）
 Editor 模块
    Editor.tsx  useAutoSave  SaveStatusManager (统一状态管理)
 导出模块 (新)
    ExportPanel  useExport  ExportService  格式转换器
 ChapterManager (重构后)
     ChapterStorageService (存储抽象层)
         TauriChapterStorage
         WebChapterStorage

后端（Rust + Tauri）
 现有 Commands: chapter.rs、file_ops/、write_protection.rs
 导出模块 (新)
     export/mod.rs
         export_txt.rs
         export_docx.rs (Word)
         export_pdf.rs (PDF)
         export_markdown.rs

### 2.2 模块职责划分

| 模块 | 层级 | 职责 | 变更类型 |
|-----|------|------|---------|
| Editor | 前端 UI | 文本编辑、快捷键、选中文本处理 | 优化 |
| useAutoSave | 前端 Hook | 防抖延迟保存触发 | 重构 |
| SaveStatusManager | 前端 Store | 统一保存状态管理 | 新增 |
| ChapterManager | 前端 Hook | 章节列表、内容管理 | 重构 |
| ChapterStorageService | 前端 Service | 存储抽象层 | 新增 |
| export/ | 后端模块 | 文件导出逻辑 | 新增 |
| chapter.rs | 后端 Command | 章节 CRUD | 不变 |
| write_protection.rs | 后端 Core | 原子写入 | 不变 |

---

## 3. 核心模块设计

### 3.1 保存状态管理器 (SaveStatusManager)

设计目标：解决保存指示灯状态异常问题

\\\\\\\\\	ypescript
// src/app/stores/saveStatusStore.ts

import { create } from 'zustand';

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

interface SaveState {
  chapterStatuses: Record<string, SaveStatus>;
  errorMessage: string | null;
  
  setSaving: (chapterId: string) => void;
  setSaved: (chapterId: string) => void;
  setUnsaved: (chapterId: string) => void;
  setError: (chapterId: string, message: string) => void;
  clearError: (chapterId: string) => void;
  clearAll: () => void;
}

export const useSaveStatusStore = create<SaveState>((set) => ({
  chapterStatuses: {},
  errorMessage: null,

  setSaving: (chapterId) =>
    set((state) => ({
      chapterStatuses: { ...state.chapterStatuses, [chapterId]: 'saving' },
    })),

  setSaved: (chapterId) =>
    set((state) => ({
      chapterStatuses: { ...state.chapterStatuses, [chapterId]: 'saved' },
    })),

  setUnsaved: (chapterId) =>
    set((state) => ({
      chapterStatuses: { ...state.chapterStatuses, [chapterId]: 'unsaved' },
    })),

  setError: (chapterId, message) =>
    set((state) => ({
      chapterStatuses: { ...state.chapterStatuses, [chapterId]: 'error' },
      errorMessage: message,
    })),

  clearError: (chapterId) =>
    set((state) => {
      const { [chapterId]: _, ...rest } = state.chapterStatuses;
      return { chapterStatuses: rest };
    }),

  clearAll: () => set({ chapterStatuses: {}, errorMessage: null }),
}));
\\\\\\\\\

### 3.2 存储服务抽象 (ChapterStorageService)

\\\\\\\\\	ypescript
// src/lib/storage/ChapterStorageService.ts

export interface IChapterStorage {
  listChapters(): Promise<ChapterMeta[]>;
  getChapterContent(chapterId: string): Promise<string>;
  saveChapterContent(chapterId: string, content: string): Promise<void>;
  createChapter(title: string): Promise<ChapterMeta>;
  deleteChapter(chapterId: string): Promise<void>;
  renameChapter(chapterId: string, newTitle: string): Promise<ChapterMeta>;
  reorderChapters(chapterIds: string[]): Promise<ChapterMeta[]>;
}

export interface ChapterMeta {
  id: string;
  title: string;
  order: number;
  created: number;
  updated: number;
  wordCount: number;
}
\\\\\\\\\

### 3.3 导出服务设计

#### 前端导出 Hook

\\\\\\\\\	ypescript
// src/hooks/useExport.ts

import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';

export type ExportFormat = 'txt' | 'docx' | 'pdf' | 'md';

export function useExport({ projectPath }: { projectPath: string }) {
  const [isExporting, setIsExporting] = useState(false);

  const exportChapter = useCallback(
    async (chapterId: string, chapterTitle: string, format: ExportFormat) => {
      setIsExporting(true);
      try {
        const filePath = await save({
          defaultPath: chapterTitle + '.' + format,
        });
        if (!filePath) return { success: false };

        await invoke('export_chapter', { projectPath, chapterId, filePath, format });
        return { success: true, filePath };
      } catch (error) {
        return { success: false, message: String(error) };
      } finally {
        setIsExporting(false);
      }
    },
    [projectPath]
  );

  return { isExporting, exportChapter };
}
\\\\\\\\\

#### 后端导出模块

\\\\\\\\\ust
// src-tauri/src/export/mod.rs

mod txt;
mod docx;
mod pdf;
mod markdown;

#[derive(Debug, Clone, Copy, serde::Serialize, serde::Deserialize)]
#[serde(rename_all =  lowercase)]
pub enum ExportFormat {
    Txt,
    Docx,
    Pdf,
    Markdown,
}

#[tauri::command(rename_all = camelCase)]
pub async fn export_chapter(
    project_path: String,
    chapter_id: String,
    file_path: String,
    format: ExportFormat,
) -> Result<(), String> {
    let content = crate::chapter::get_chapter_content_sync(
        project_path.clone(), chapter_id.clone()
    )?;
    
    let meta = crate::chapter::read_index(std::path::Path::new(&project_path))?
        .chapters.into_iter()
        .find(|c| c.id == chapter_id)
        .ok_or(Chapter not found)?;

    match format {
        ExportFormat::Txt => txt::write(&file_path, &content),
        ExportFormat::Docx => docx::generate(&file_path, &meta.title, &content),
        ExportFormat::Pdf => pdf::generate(&file_path, &meta.title, &content),
        ExportFormat::Markdown => markdown::write(&file_path, &meta.title, &content),
    }
}
\\\\\\\\\

---

## 4. 文件格式转换方案

### 4.1 格式支持矩阵

| 格式 | 扩展名 | 读取支持 | 写入支持 | 依赖库 |
|-----|--------|---------|---------|-------|
| 纯文本 | .txt | 是 | 是 | 标准库 |
| Markdown | .md | 是 | 是 | 标准库 |
| Word | .docx | 导入已有 | 导出 | docx crate |
| PDF | .pdf | 否 | 导出 | printpdf crate |

### 4.2 DOCX 转换实现

\\\\\\\\\ust
// src-tauri/src/export/docx.rs

use docx::document::{Document, Paragraph};
use docx::content::Text;
use std::fs::File;

pub fn generate(file_path: &str, title: &str, content: &str) -> Result<(), String> {
    let mut doc = Document::new();
    
    // 添加标题
    let title_para = Paragraph::new().add_run(Text::new(title).bold());
    doc.add_paragraph(title_para);
    
    // 按段落分割内容
    for para in content.split('\\\\n') {
        if para.trim().is_empty() { continue; }
        doc.add_paragraph(Paragraph::new().add_run(Text::new(para)));
    }
    
    let file = File::create(file_path).map_err(|e| e.to_string())?;
    doc.write(file).map_err(|e| e.to_string())?;
    Ok(())
}
\\\\\\\\\

### 4.3 PDF 转换实现

\\\\\\\\\ust
// src-tauri/src/export/pdf.rs

use printpdf::*;
use std::fs::File;
use std::io::BufWriter;

pub fn generate(file_path: &str, title: &str, content: &str) -> Result<(), String> {
    let (doc, page1, layer1) = PdfDocument::new(
        Novel Export,
        Mm(210.0), Mm(297.0),
        Layer 1,
    );
    
    let layer = doc.get_page(page1).get_layer(layer1);
    let font = doc.add_builtin_font(BuiltinFont::Helvetica).map_err(|e| e.to_string())?;
    
    // 绘制标题
    layer.use_text(title, 24.0, Mm(20.0), Mm(277.0), &font);
    
    // 绘制正文
    let mut y = 260.0;
    for para in content.split('\\\\n') {
        if para.trim().is_empty() { y -= 6.0; continue; }
        layer.use_text(para, 12.0, Mm(20.0), Mm(y), &font);
        y -= 6.0;
    }
    
    let file = File::create(file_path).map_err(|e| e.to_string())?;
    doc.save(&mut BufWriter::new(file)).map_err(|e| e.to_string())?;
    Ok(())
}
\\\\\\\\\

---

## 5. 数据流设计

### 5.1 保存数据流

用户输入 -> CodeMirror -> onChange(value) -> useAutoSave (2秒防抖) -> onSave(content) -> useChapterManager.saveChapter() -> SaveStatusManager.setSaving() -> ChapterStorageService.saveChapterContent() -> invoke(save_chapter_content) -> 文件系统 -> SaveStatusManager.setSaved() -> StatusBar 显示

### 5.2 导出数据流

用户点击导出 -> ExportPanel -> useExport.exportChapter() -> Tauri dialog 保存对话框 -> invoke(export_chapter) -> export/mod.rs (格式转换) -> 文件写入磁盘 -> 返回结果

---

## 6. 技术风险与缓解措施

| 风险 | 可能性 | 影响 | 缓解措施 |
|-----|-------|------|---------|
| PDF 生成库导致二进制体积增大 | 中 | 低 | 使用轻量级 printpdf |
| 大文档导出内存占用 | 低 | 中 | 流式写入、进度提示 |
| 多格式导出格式转换失败 | 中 | 中 | 错误捕获、逐个报告 |
| 保存竞态条件 | 低 | 高 | 乐观锁或操作序列号 |

### Cargo.toml 新增依赖

\\\\\\\\\	oml
[dependencies]
docx = 0.4       # Word 文档生成
printpdf = 0.7    # PDF 生成
\\\\\\\\\

---

## 7. 实现计划

### 7.1 里程碑

| 阶段 | 内容 | 优先级 |
|-----|------|-------|
| M1 | 修复保存指示灯异常 | P0 |
| M2 | 新增 TXT/MD 导出 | P0 |
| M3 | 新增 DOCX 导出 | P1 |
| M4 | 新增 PDF 导出 | P1 |
| M5 | 导出面板 UI | P1 |
| M6 | 批量导出支持 | P2 |

### 7.2 任务分解

#### M1: 修复保存指示灯异常
- 创建 src/app/stores/saveStatusStore.ts
- 重构 useChapterManager.ts 使用 SaveStatusStore
- 重构 useAutoSave.ts 集成 SaveStatusStore
- 更新 StatusBar.tsx 读取全局保存状态
- 编写单元测试验证状态同步

#### M2: TXT/MD 导出
- 创建 src-tauri/src/export/mod.rs
- 实现 txt::write() 和 markdown::write()
- 注册 export_chapter 和 export_all_chapters 命令
- 前端创建 useExport.ts Hook
- 创建导出面板 UI
- E2E 测试验证

#### M3: DOCX 导出
- 添加 docx crate 依赖
- 实现 docx::generate()
- 添加错误处理

#### M4: PDF 导出
- 添加 printpdf crate 依赖
- 实现 pdf::generate()
- 处理中文显示

---

## 8. 附录

### 8.1 相关文件路径

| 文件 | 路径 |
|-----|------|
| 编辑器组件 | src/components/Editor/Editor.tsx |
| 自动保存 Hook | src/components/Editor/useAutoSave.ts |
| 章节管理 Hook | src/hooks/useChapterManager.ts |
| 状态栏组件 | src/components/StatusBar/StatusBar.tsx |
| 后端章节管理 | src-tauri/src/chapter.rs |
| 后端文件写入 | src-tauri/src/file_ops/write.rs |
| 后端原子写入 | src-tauri/src/write_protection.rs |
| 后端命令注册 | src-tauri/src/lib.rs |

### 8.2 新增 Tauri Commands

\\\\\\\\\	ypescript
// 导出单个章节
invoke('export_chapter', {
  projectPath: string,
  chapterId: string,
  filePath: string,
  format: 'txt' | 'docx' | 'pdf' | 'md'
}): Promise<void>

// 导出全部章节
invoke('export_all_chapters', {
  projectPath: string,
  exportDir: string,
  format: 'txt' | 'docx' | 'pdf' | 'md'
}): Promise<string[]>
\\\\\\\\\

### 8.3 样式变量

\\\\\\\\\css
/* status-bar.css 状态颜色 */
.status-icon-saved { color: #52c41a; }   /* 绿色 */
.status-icon-saving { color: #1890ff; }  /* 蓝色 */
.status-icon-unsaved { color: #faad14; } /* 黄色 */
.status-icon-error { color: #ff4d4f; }  /* 红色 */
\\\\\\\\\

---

*文档版本：1.0*
*创建时间：2026-04-06*
*作者：架构设计专家*
\;

fs.writeFileSync(path, content, 'utf8');
console.log('File created: ' + path);