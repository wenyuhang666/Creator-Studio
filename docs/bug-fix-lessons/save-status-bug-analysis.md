# 编辑器保存状态 Bug 修复经验总结

## 问题概述

**症状**：打开项目后，章节状态错误显示为"🟡 未保存"，应为"🟢 已保存"

**影响**：用户每次打开项目都会看到未保存提示，体验极差

---

## 问题根因分析

### 核心问题：状态管理架构混乱

```
保存状态有 3 个独立的来源：

1. useChapterManager.saveStatus
   - 初始化: "saved"
   - 加载内容: "saved" 
   - 用户编辑: "unsaved"
   - 广播事件: "creatorai:chapterSaveStatus"

2. useAutoSave.status  
   - 初始化: "saved" (lastSavedContent = content)
   - content 变化: "unsaved" (如果 content !== lastSavedContent)
   - 自动保存成功: "saved"
   - 广播事件: "creatorai:saveStatus" (不兼容!)

3. MainLayout.editorSaveStatus
   - 从 Editor 同步
   - 用于 UI 显示
```

### 问题链

```
用户打开项目
    ↓
章节加载 → chapterContent = "实际内容"
    ↓
onContentChange("实际内容") → handleDraftChange()
    ↓
chapter.setDraftContent("实际内容")
    ↓
setSaveStatus("unsaved") ← 错误! 加载不应该触发未保存
    ↓
同时: value 变化 → useAutoSave 检测到 content !== lastSavedContent
    ↓
status = "unsaved" ← 双重错误!
```

### 为什么修复失败这么多次？

| 尝试 | 失败原因 |
|------|----------|
| 添加 `isLoadingContentRef` | 只修复了 `setDraftContent`，但 `useAutoSave` 仍有自己的状态判断 |
| 修改 `useAutoSave` 初始化逻辑 | 条件判断不对，没覆盖所有场景 |
| 修改事件名称 | 没发现 Editor 和 ChapterList 监听的事件名不一致 |

---

## 最终解决方案

### 1. 统一事件名称
```typescript
// Editor.tsx: 发送带 chapterId 的事件
window.dispatchEvent(
  new CustomEvent("creatorai:chapterSaveStatus", { 
    detail: { projectPath, chapterId, saveStatus: status } 
  })
);

// ChapterList.tsx: 监听相同的事件
window.addEventListener("creatorai:chapterSaveStatus", onSaveStatusChange);
```

### 2. useChapterManager 不再管理 saveStatus
```typescript
// setDraftContent 只更新内容，不设置 saveStatus
const setDraftContent = useCallback((content: string) => {
  if (isLoadingContentRef.current) return;  // 加载时跳过
  if (content !== draftContent) {
    setDraftContentState(content);
    // 不设置 saveStatus，避免重复状态管理
  }
}, [draftContent]);
```

### 3. useAutoSave 统一管理状态
```typescript
// 首次加载检测
useEffect(() => {
  if (!isInitializedRef.current && content && !lastSavedContent) {
    setLastSavedContent(content);  // 同步
    setStatus("saved");
    isInitializedRef.current = true;
    return;
  }
  isInitializedRef.current = true;
  
  if (content !== lastSavedContent) {
    setStatus("unsaved");
  }
}, [content, lastSavedContent]);
```

---

## 经验教训

### 1. 状态管理原则
**单一数据源 (Single Source of Truth)**
- 保存状态应该由 **一个** 组件/hook 管理
- 多个组件同时管理同一状态会导致不一致
- 建议：只让 `useAutoSave` 管理 `saved/unsaved` 状态

### 2. 初始化状态处理
- 组件/hook 初始化时的状态必须与实际数据同步
- 不能假设初始值是空的
- 必须处理"加载中"状态

### 3. 事件通信规范
- 所有相关组件必须监听**相同的事件名称**
- 事件 payload 必须包含所有必要的上下文信息（如 chapterId）
- 避免隐式依赖

### 4. 调试技巧
- 打印状态变化的日志
- 画出状态变化流程图
- 检查所有状态来源

---

## 今日其他修复

### 1. 章节切换确认对话框
**问题**：用户切换章节时，未保存内容可能丢失
**修复**：ChapterList 添加确认对话框
**经验**：数据保护比用户体验更重要

### 2. 文件不存在时自动重建
**问题**：章节文件不存在时无法保存
**修复**：Rust 后端自动创建空文件
**经验**：文件系统操作必须有容错处理

### 3. 章节内容加载为空
**问题**：章节内容显示为空
**修复**：Editor.tsx 添加 `prevInitialContentRef` 追踪变化
**经验**：外部数据变化必须显式处理

---

## 下次开发检查清单

```markdown
## 保存状态修改前检查
- [ ] 确认状态由哪个组件管理
- [ ] 所有相关组件监听相同事件
- [ ] 初始化状态与实际数据同步
- [ ] 加载/编辑状态区分
- [ ] 测试打开项目时的初始状态
- [ ] 测试章节切换时的状态变化
```
