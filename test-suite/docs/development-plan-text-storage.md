# 文本编辑与文件存储功能开发计划

## 一、问题分析

### 1.1 保存指示灯状态问题（核心 Bug）

**问题描述**：右下角保存指示灯一直显示"未保存"

**根本原因**：
- `Editor.tsx` 使用 `useAutoSave` hook 独立管理保存状态
- `MainLayout.tsx` 的 `StatusBar` 使用 `chapter.saveStatus`（来自 `useChapterManager`）
- 两套状态系统没有同步，导致状态不一致

**状态流分析**：
```
Editor.tsx:
  - useAutoSave 内部状态: saved/saving/unsaved
  - 调用 onSaveStatusChange?.(status) 通知状态变化
  - 但 MainLayout.tsx 没有传递 onSaveStatusChange prop

MainLayout.tsx:
  - StatusBar 使用 chapter.saveStatus
  - 没有监听或同步 Editor 的保存状态
```

**修复方案**：
1. 方案 A：让 `useChapterManager` 统一管理状态，`useAutoSave` 使用外部状态
2. 方案 B：让 `MainLayout` 监听 `Editor` 的保存状态并同步

### 1.2 文件位置可见功能（需求缺失）

**用户痛点**：不知道文件保存在哪里

**需要实现**：
- 显示当前章节文件的保存路径
- 提供"打开文件夹"按钮（调用系统文件管理器）
- 在 Tauri 后端添加 `open_folder` 命令

### 1.3 导出功能（需求缺失）

**需要实现**：
- TXT 导出（Tauri 后端直接写入）
- Word (DOCX) 导出（前端 docx npm 包）
- PDF 导出（Tauri 端 printpdf 或前端 jspdf）

---

## 二、开发计划

### 阶段 1：P0 核心功能（必须完成）

#### 任务 1.1：修复保存指示灯状态同步问题

**负责人**：software-engineer-dev

**涉及文件**：
- `src/components/Editor/Editor.tsx`
- `src/hooks/useChapterManager.ts`
- `src/layouts/MainLayout.tsx`
- `src/components/StatusBar/StatusBar.tsx`

**修改内容**：
1. 修改 `MainLayout.tsx`，传递 `onSaveStatusChange` 回调给 `Editor`
2. 在 `MainLayout.tsx` 中接收保存状态，同步到 `chapter.saveStatus`
3. 或者：重构 `useAutoSave` 支持外部状态源

**验收标准**：
- [ ] 编辑内容后状态栏显示"未保存"
- [ ] 保存完成后状态栏显示"已保存"
- [ ] 保存过程中显示"保存中..."

#### 任务 1.2：文件位置可见功能

**负责人**：software-engineer-feature

**涉及文件**：
- `src-tauri/src/chapter.rs` - 添加打开文件夹命令
- `src/components/Editor/EditorHeader.tsx` - 添加路径显示
- `src/components/StatusBar/StatusBar.tsx` - 添加打开文件夹按钮

**修改内容**：
1. Rust 后端：添加 `open_chapter_folder` 命令，使用 `std::process::Command` 调用 `explorer`
2. 前端：添加按钮调用 Tauri 命令打开文件夹
3. 可选：在编辑器头部或状态栏显示当前文件路径

**验收标准**：
- [ ] 状态栏有"打开文件夹"按钮
- [ ] 点击后打开章节所在目录
- [ ] 可选：鼠标悬停显示完整路径

#### 任务 1.3：TXT 导出功能

**负责人**：software-engineer-dev

**涉及文件**：
- `src-tauri/src/chapter.rs` - 添加导出命令
- `src/components/Sidebar/Sidebar.tsx` - 添加导出菜单
- `src/components/Export/ExportModal.tsx` - 新建导出对话框

**修改内容**：
1. Rust 后端：添加 `export_chapters` 命令，支持导出单章或全本为 TXT
2. 前端：创建导出对话框组件，支持选择章节和格式
3. 使用 Tauri 的文件保存对话框让用户选择位置

**验收标准**：
- [ ] 可选择单章导出
- [ ] 可选择全本导出
- [ ] 文件编码为 UTF-8
- [ ] 章节之间有分隔

---

### 阶段 2：P1 重要功能

#### 任务 2.1：Word (DOCX) 导出功能

**负责人**：software-engineer-feature

**涉及文件**：
- `package.json` - 添加 docx 依赖
- `src/components/Export/ExportModal.tsx` - 添加 Word 格式选项
- `src/utils/exportToDocx.ts` - 新建导出工具

**技术方案**：
- 使用 `docx` npm 包（前端实现，跨平台一致）
- 优点：降低开发复杂度，无需 Tauri 端依赖
- 缺点：包体积约 1MB

**修改内容**：
1. 安装 `docx` npm 包
2. 创建 `exportToDocx.ts` 工具函数
3. 在导出对话框中添加 Word 格式选项
4. 实现章节标题 Heading 样式

**验收标准**：
- [ ] 生成标准 DOCX 文件
- [ ] 章节标题使用 Heading 样式
- [ ] Word 2016+ 可正常打开

#### 任务 2.2：PDF 导出功能

**负责人**：software-engineer-feature

**涉及文件**：
- `src-tauri/Cargo.toml` - 添加 printpdf 依赖
- `src-tauri/src/export.rs` - 新建导出模块
- `src/components/Export/ExportModal.tsx` - 添加 PDF 格式选项

**技术方案**：
- 方案 1：前端 `jspdf`（简单但样式有限）
- 方案 2：Tauri `printpdf`（质量更好）
- 推荐：方案 2

**修改内容**：
1. Rust 后端添加 `printpdf` 依赖
2. 创建 PDF 导出逻辑
3. 在导出对话框中添加 PDF 格式选项
4. 支持设置纸张大小和页边距

**验收标准**：
- [ ] 生成标准 PDF 文件
- [ ] 页面布局合理
- [ ] 章节标题突出显示

---

## 三、技术架构

### 3.1 状态管理架构

```
┌─────────────────────────────────────────────────────────────┐
│                        MainLayout.tsx                        │
│  ┌──────────────────┐    ┌──────────────────┐              │
│  │  useChapterManager │    │   Editor (ref)    │              │
│  │  - saveStatus      │    │   - onSaveStatus  │              │
│  │  - chapterContent  │    │     Change        │              │
│  └────────┬─────────┘    └────────┬─────────┘              │
│           │                        │                         │
│           └────────┬───────────────┘                         │
│                    ▼                                         │
│           ┌──────────────────┐                              │
│           │    StatusBar     │                              │
│           │  - saveStatus    │                              │
│           └──────────────────┘                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 导出功能架构

```
┌─────────────────────────────────────────────────────────────┐
│                    ExportModal.tsx                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  导出选项                                              │   │
│  │  - 范围：单章 / 多章 / 全本                           │   │
│  │  - 格式：TXT / Word / PDF                            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     导出处理层                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐                │
│  │   TXT   │    │  Word   │    │   PDF   │                │
│  │ (Rust)  │    │ (JS)    │    │ (Rust)  │                │
│  └────┬────┘    └────┬────┘    └────┬────┘                │
│       │              │              │                       │
└───────┼──────────────┼──────────────┼───────────────────────┘
        │              │              │
        ▼              ▼              ▼
   文件系统写入    docx npm包     printpdf crate
```

### 3.3 文件路径结构

```
Creator-Studio/
├── src/
│   ├── components/
│   │   ├── Editor/
│   │   │   ├── Editor.tsx
│   │   │   ├── EditorHeader.tsx
│   │   │   └── useAutoSave.ts
│   │   ├── StatusBar/
│   │   │   └── StatusBar.tsx
│   │   └── Export/                    # 新建
│   │       ├── ExportModal.tsx
│   │       └── ExportButton.tsx
│   └── utils/
│       └── exportToDocx.ts           # 新建
│
└── src-tauri/
    └── src/
        ├── chapter.rs                 # 修改：添加导出命令
        ├── export.rs                  # 新建：PDF导出
        └── lib.rs                     # 修改：注册命令
```

---

## 四、依赖关系

### 4.1 任务依赖图

```
任务 1.1 (保存状态修复)
    │
    ▼
任务 1.2 (文件位置可见) ←── 依赖任务 1.1
    │
    ▼
任务 1.3 (TXT导出) ←────── 依赖任务 1.1
    │
    ├──► 任务 2.1 (Word导出)
    │
    └──► 任务 2.2 (PDF导出)
```

### 4.2 技术依赖

| 任务 | 前置依赖 | 技术依赖 |
|------|---------|---------|
| 1.1 保存状态修复 | 无 | React hooks, 状态管理 |
| 1.2 文件位置可见 | 1.1 | Tauri IPC, Rust Command |
| 1.3 TXT导出 | 1.1 | Tauri dialog, 文件系统 |
| 2.1 Word导出 | 1.3 | docx npm 包 |
| 2.2 PDF导出 | 1.3 | printpdf crate |

---

## 五、风险评估

### 5.1 技术风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|-----|------|---------|
| 状态同步逻辑复杂 | 高 | 中 | 统一使用 `useChapterManager` 管理状态 |
| docx 包体积大 | 中 | 低 | 考虑动态导入或懒加载 |
| PDF 排版复杂 | 高 | 中 | 使用成熟库，预设模板 |
| 编码问题 | 中 | 中 | 统一使用 UTF-8，写入 BOM |

### 5.2 进度风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|-----|------|---------|
| 测试用例未覆盖边缘情况 | 中 | 中 | 按测试用例清单执行 |
| 多端兼容问题 | 中 | 低 | 在 Windows 10/11 上验证 |

---

## 六、测试计划

### 6.1 P0 测试用例（优先执行）

| 用例编号 | 测试内容 | 验收条件 |
|---------|---------|---------|
| TC_STATUS_001 | 未保存状态显示 | 状态栏显示红色圆点 + "未保存" |
| TC_STATUS_002 | 保存中状态显示 | 状态栏显示旋转图标 + "保存中..." |
| TC_SAVE_001 | 手动保存功能 | Ctrl+S 保存成功，状态栏正确更新 |
| TC_SAVE_002 | 保存内容一致性 | 文件内容与编辑器一致 |
| TC_AUTO_001 | 自动保存触发 | 编辑后 2 秒自动保存 |
| TC_AUTO_002 | 无修改不触发保存 | 状态保持"已保存" |
| TC_PATH_001 | 打开文件夹功能 | 点击后打开正确目录 |

### 6.2 P1 测试用例

| 用例编号 | 测试内容 | 验收条件 |
|---------|---------|---------|
| TC_EXPORT_001 | TXT 单章导出 | 文件生成，内容正确 |
| TC_EXPORT_002 | TXT 全本导出 | 多章合并，章节分隔 |
| TC_EXPORT_003 | Word 导出 | DOCX 文件可打开 |
| TC_EXPORT_004 | PDF 导出 | PDF 文件可打开 |

---

## 七、任务分配

### 7.1 software-engineer-dev

**主要职责**：
- 任务 1.1：保存指示灯状态修复
- 任务 1.3：TXT 导出功能
- 代码审查和合并

**技能要求**：
- 熟悉 React/TypeScript
- 了解 Tauri IPC
- 理解状态管理

### 7.2 software-engineer-feature

**主要职责**：
- 任务 1.2：文件位置可见功能
- 任务 2.1：Word 导出功能
- 任务 2.2：PDF 导出功能

**技能要求**：
- 熟悉前端 UI 开发
- 了解文档格式处理
- 有 Rust 基础优先

---

## 八、开发时间线

### 阶段 1：P0 核心功能（预计 3 天）

| 日期 | 任务 | 交付物 |
|------|------|--------|
| Day 1 | 任务 1.1 | 保存状态同步修复代码 |
| Day 2 | 任务 1.2 | 打开文件夹功能 |
| Day 3 | 任务 1.3 | TXT 导出功能 |

### 阶段 2：P1 重要功能（预计 5 天）

| 日期 | 任务 | 交付物 |
|------|------|--------|
| Day 4-5 | 任务 2.1 | Word 导出功能 |
| Day 6-7 | 任务 2.2 | PDF 导出功能 |
| Day 8 | 集成测试 | 全功能测试 |

---

## 九、后续行动

### 立即行动项

- [ ] 与项目经理同步开发计划
- [ ] 分配任务给 software-engineer-dev 和 software-engineer-feature
- [ ] 创建 feature 分支：`feature/text-storage`
- [ ] 安装必要的 npm 依赖：`docx`

### 审查项

- [ ] 审查任务 1.1 的代码修改
- [ ] 审查任务 1.2 的 Tauri 命令设计
- [ ] 审查任务 1.3 的导出逻辑
- [ ] 执行 P0 测试用例

---

## 十、附录

### A. 相关文档

- [需求分析文档](../test-suite/docs/text-storage-requirements.md)
- [架构设计文档](../test-suite/docs/text-storage-architecture.md)
- [测试用例清单](../test-suite/docs/text-storage-tests.md)
- [现有架构说明](./docs/架构说明.md)

### B. 参考资源

- Tauri 文件操作：[tauri-plugin-fs](https://tauri.app/plugin/fs/)
- Tauri 对话框：[tauri-plugin-dialog](https://tauri.app/plugin/dialog/)
- docx npm 包：[npmjs.com/package/docx](https://www.npmjs.com/package/docx)
- printpdf crate：[docs.rs/printpdf](https://docs.rs/printpdf)
