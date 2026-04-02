# Phase 3: 世界观 AI + 润色 UI + 对话联动 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在世界观面板中添加「AI 提取」功能（从章节文本自动提取人物/关系/势力/事件），在编辑器中添加润色浮动工具栏，以及在 AI 对话 system prompt 中注入世界观上下文。

**Architecture:** 世界观 AI 提取通过 Modal 组件调用 Phase 2 的 `aiExtract` API，预览后写入 Zustand store。润色功能通过 CodeMirror tooltip 展示浮动工具栏，调用 `aiTransform` API，结果以 Decoration 形式内联预览。对话联动通过构建世界观摘要字符串注入到 system prompt。

**Tech Stack:** React, antd Modal/Table/Checkbox, CodeMirror 6 (tooltip + Decoration), Zustand, Tauri invoke

---

## File Structure

### New files
- `src/features/worldbuilding/components/AIExtractModal.tsx` — AI 提取 Modal（范围选择 + loading + 预览表格 + 确认导入）
- `src/features/worldbuilding/utils/mergeExtracted.ts` — 增量合并逻辑（名字匹配 + 去重）
- `src/components/Editor/PolishToolbar.tsx` — 编辑器浮动润色工具栏
- `src/components/Editor/polishPreview.ts` — CodeMirror Decoration 渲染 diff 预览
- `src/features/worldbuilding/utils/buildWorldSummary.ts` — 世界观摘要构建

### Modified files
- `src/components/Worldbuilding/WorldbuildingPanel.tsx` — 添加 AI 提取按钮 + 引入 Modal
- `src/components/Editor/Editor.tsx` — 集成浮动润色工具栏
- `src/components/AIPanel/AIPanel.tsx` — system prompt 注入世界观摘要

---

### Task 1: 增量合并工具函数

**Files:**
- Create: `src/features/worldbuilding/utils/mergeExtracted.ts`

- [ ] **Step 1: 创建 mergeExtracted.ts**

```typescript
import type { Character, Relationship } from '../types';
import type { ExtractedWorldbuilding } from '../../../lib/ai';

interface MergePreview {
  newCharacters: ExtractedWorldbuilding['characters'];
  updatedCharacters: Array<{ existing: Character; updates: Partial<Character> }>;
  newRelationships: ExtractedWorldbuilding['relationships'];
  newFactions: ExtractedWorldbuilding['factions'];
  newEvents: ExtractedWorldbuilding['events'];
}

/**
 * 将 AI 提取的世界观数据与现有 store 数据对比，生成预览
 */
export function buildMergePreview(
  extracted: ExtractedWorldbuilding,
  existingCharacters: Character[],
  existingRelationships: Relationship[],
): MergePreview {
  const newChars: ExtractedWorldbuilding['characters'] = [];
  const updatedChars: MergePreview['updatedCharacters'] = [];

  for (const ext of extracted.characters) {
    const match = existingCharacters.find(
      (c) => c.name === ext.name || c.name.includes(ext.name) || ext.name.includes(c.name),
    );
    if (match) {
      const updates: Partial<Character> = {};
      if (ext.description && !match.description) updates.description = ext.description;
      if (ext.tags?.length && (!match.tags || match.tags.length === 0)) updates.tags = ext.tags;
      if (Object.keys(updates).length > 0) {
        updatedChars.push({ existing: match, updates });
      }
    } else {
      newChars.push(ext);
    }
  }

  // 过滤已存在的关系（from+to+type 匹配）
  const newRels = extracted.relationships.filter((rel) => {
    return !existingRelationships.some(
      (r) => {
        const fromChar = existingCharacters.find((c) => c.id === r.from);
        const toChar = existingCharacters.find((c) => c.id === r.to);
        return fromChar?.name === rel.from && toChar?.name === rel.to && r.type === rel.type;
      },
    );
  });

  return {
    newCharacters: newChars,
    updatedCharacters: updatedChars,
    newRelationships: newRels,
    newFactions: extracted.factions ?? [],
    newEvents: extracted.events ?? [],
  };
}

export type { MergePreview };
```

- [ ] **Step 2: Commit**

```bash
git add src/features/worldbuilding/utils/mergeExtracted.ts
git commit -m "feat: add merge preview utility for AI-extracted worldbuilding data

Compares extracted characters/relationships against existing store,
producing a preview of what's new vs what can be updated."
```

---

### Task 2: AI 提取 Modal 组件

**Files:**
- Create: `src/features/worldbuilding/components/AIExtractModal.tsx`

- [ ] **Step 1: 创建 AIExtractModal.tsx**

```typescript
import React, { useState } from 'react';
import { Modal, Button, Input, Tabs, Checkbox, Table, Space, message, Spin, Tag, Alert } from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/core';
import { aiExtract, type ExtractedWorldbuilding } from '../../../lib/ai';
import { useCharacterStore } from '../store/characterStore';
import { useFactionStore } from '../store/factionStore';
import { useTimelineStore } from '../store/timelineStore';
import { buildMergePreview, type MergePreview } from '../utils/mergeExtracted';

const { TextArea } = Input;

interface AIExtractModalProps {
  visible: boolean;
  onClose: () => void;
  projectPath?: string;
}

type SourceType = 'paste' | 'chapters';

const AIExtractModal: React.FC<AIExtractModalProps> = ({ visible, onClose, projectPath }) => {
  const [source, setSource] = useState<SourceType>('paste');
  const [pasteText, setPasteText] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<MergePreview | null>(null);
  const [selectedNewChars, setSelectedNewChars] = useState<Set<number>>(new Set());
  const [selectedNewRels, setSelectedNewRels] = useState<Set<number>>(new Set());

  const { characters, relationships, addCharacter, addRelationship, updateCharacter } = useCharacterStore();
  const { addFaction } = useFactionStore();
  const { addTimeline, addEvent } = useTimelineStore();

  const handleExtract = async () => {
    let text = '';
    if (source === 'paste') {
      text = pasteText.trim();
    } else if (projectPath) {
      try {
        const chapters = await invoke<Array<{ id: string; title: string }>>('list_chapters', { projectPath });
        const contents: string[] = [];
        for (const ch of chapters.slice(0, 10)) {
          const content = await invoke<string>('get_chapter_content', { projectPath, chapterId: ch.id });
          contents.push(content);
        }
        text = contents.join('\n\n---\n\n');
      } catch (err) {
        message.error('读取章节失败');
        return;
      }
    }

    if (!text || text.length < 50) {
      message.warning('文本内容太短（至少 50 字），无法有效提取');
      return;
    }

    // 截取前 8000 字符避免 token 溢出
    const truncated = text.slice(0, 8000);

    setLoading(true);
    try {
      const result = await aiExtract({ text: truncated });
      if (!result.structured) {
        message.error('AI 未能返回结构化数据，请重试');
        setLoading(false);
        return;
      }
      const mergePreview = buildMergePreview(result.structured, characters, relationships);
      setPreview(mergePreview);
      // 默认全选新增项
      setSelectedNewChars(new Set(mergePreview.newCharacters.map((_, i) => i)));
      setSelectedNewRels(new Set(mergePreview.newRelationships.map((_, i) => i)));
    } catch (err) {
      message.error(`提取失败: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = () => {
    if (!preview) return;

    // 导入选中的新角色
    const charNameToId = new Map<string, string>();
    characters.forEach((c) => charNameToId.set(c.name, c.id));

    for (const [i, char] of preview.newCharacters.entries()) {
      if (!selectedNewChars.has(i)) continue;
      const created = addCharacter({
        name: char.name,
        description: char.description,
        role: char.role as any,
        tags: char.tags,
        attributes: {},
      });
      charNameToId.set(char.name, created.id);
    }

    // 更新已有角色
    for (const { existing, updates } of preview.updatedCharacters) {
      updateCharacter(existing.id, updates);
    }

    // 导入选中的关系
    for (const [i, rel] of preview.newRelationships.entries()) {
      if (!selectedNewRels.has(i)) continue;
      const fromId = charNameToId.get(rel.from);
      const toId = charNameToId.get(rel.to);
      if (fromId && toId) {
        addRelationship({
          from: fromId,
          to: toId,
          type: rel.type as any,
          description: rel.description,
        });
      }
    }

    // 导入势力
    for (const faction of preview.newFactions) {
      addFaction({
        name: faction.name,
        description: faction.description,
        parentId: null,
        members: faction.members,
        attributes: {},
      });
    }

    // 导入事件到默认时间线
    if (preview.newEvents.length > 0) {
      let timelineId = useTimelineStore.getState().activeTimelineId;
      if (!timelineId) {
        const tl = addTimeline({ name: 'AI 提取的时间线', description: '' });
        timelineId = tl.id;
      }
      for (const event of preview.newEvents) {
        addEvent(timelineId, {
          title: event.title,
          description: event.description,
          type: event.type as any,
          date: '',
          tags: event.characters,
          relatedCharacters: [],
          relatedFactions: [],
        });
      }
    }

    message.success('世界观数据已导入');
    setPreview(null);
    onClose();
  };

  const handleClose = () => {
    setPreview(null);
    setPasteText('');
    onClose();
  };

  return (
    <Modal
      title={<><RobotOutlined /> AI 提取世界观</>}
      open={visible}
      onCancel={handleClose}
      width={720}
      footer={preview ? (
        <Space>
          <Button onClick={() => setPreview(null)}>返回</Button>
          <Button type="primary" onClick={handleImport}>确认导入</Button>
        </Space>
      ) : null}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>AI 正在分析文本，提取人物、关系、势力、事件...</div>
        </div>
      ) : preview ? (
        <div>
          {preview.newCharacters.length > 0 && (
            <>
              <h4>新增人物 ({preview.newCharacters.length})</h4>
              <Table
                size="small"
                dataSource={preview.newCharacters.map((c, i) => ({ ...c, key: i }))}
                pagination={false}
                columns={[
                  {
                    title: '',
                    width: 40,
                    render: (_, __, i) => (
                      <Checkbox
                        checked={selectedNewChars.has(i)}
                        onChange={(e) => {
                          const next = new Set(selectedNewChars);
                          e.target.checked ? next.add(i) : next.delete(i);
                          setSelectedNewChars(next);
                        }}
                      />
                    ),
                  },
                  { title: '名称', dataIndex: 'name' },
                  { title: '描述', dataIndex: 'description', ellipsis: true },
                  { title: '角色', dataIndex: 'role', width: 80 },
                ]}
              />
            </>
          )}
          {preview.updatedCharacters.length > 0 && (
            <>
              <h4 style={{ marginTop: 16 }}>更新现有人物 ({preview.updatedCharacters.length})</h4>
              {preview.updatedCharacters.map(({ existing, updates }) => (
                <Alert
                  key={existing.id}
                  type="info"
                  showIcon={false}
                  message={`${existing.name}: 补充 ${Object.keys(updates).join(', ')}`}
                  style={{ marginBottom: 4 }}
                />
              ))}
            </>
          )}
          {preview.newRelationships.length > 0 && (
            <>
              <h4 style={{ marginTop: 16 }}>新增关系 ({preview.newRelationships.length})</h4>
              <Table
                size="small"
                dataSource={preview.newRelationships.map((r, i) => ({ ...r, key: i }))}
                pagination={false}
                columns={[
                  {
                    title: '',
                    width: 40,
                    render: (_, __, i) => (
                      <Checkbox
                        checked={selectedNewRels.has(i)}
                        onChange={(e) => {
                          const next = new Set(selectedNewRels);
                          e.target.checked ? next.add(i) : next.delete(i);
                          setSelectedNewRels(next);
                        }}
                      />
                    ),
                  },
                  { title: '从', dataIndex: 'from', width: 100 },
                  { title: '到', dataIndex: 'to', width: 100 },
                  { title: '类型', dataIndex: 'type', width: 80, render: (t: string) => <Tag>{t}</Tag> },
                  { title: '描述', dataIndex: 'description', ellipsis: true },
                ]}
              />
            </>
          )}
          {preview.newFactions.length > 0 && (
            <h4 style={{ marginTop: 16 }}>新增势力: {preview.newFactions.map((f) => f.name).join(', ')}</h4>
          )}
          {preview.newEvents.length > 0 && (
            <h4 style={{ marginTop: 16 }}>新增事件: {preview.newEvents.length} 个</h4>
          )}
          {preview.newCharacters.length === 0 && preview.updatedCharacters.length === 0 &&
           preview.newRelationships.length === 0 && preview.newFactions.length === 0 &&
           preview.newEvents.length === 0 && (
            <Alert type="info" message="文本中未发现新的世界观信息" />
          )}
        </div>
      ) : (
        <Tabs
          activeKey={source}
          onChange={(k) => setSource(k as SourceType)}
          items={[
            {
              key: 'paste',
              label: '粘贴文本',
              children: (
                <div>
                  <TextArea
                    rows={10}
                    placeholder="粘贴小说文本，AI 将自动提取人物、关系、势力、事件..."
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                  />
                  <Button
                    type="primary"
                    style={{ marginTop: 12 }}
                    onClick={handleExtract}
                    disabled={!pasteText.trim()}
                  >
                    开始提取
                  </Button>
                </div>
              ),
            },
            ...(projectPath ? [{
              key: 'chapters' as const,
              label: '从章节提取',
              children: (
                <div>
                  <Alert
                    type="info"
                    message="将读取项目的前 10 个章节，合并后交给 AI 分析"
                    style={{ marginBottom: 12 }}
                  />
                  <Button type="primary" onClick={handleExtract}>
                    开始提取
                  </Button>
                </div>
              ),
            }] : []),
          ]}
        />
      )}
    </Modal>
  );
};

export default AIExtractModal;
```

- [ ] **Step 2: Commit**

```bash
git add src/features/worldbuilding/components/AIExtractModal.tsx
git commit -m "feat: add AI extract modal for worldbuilding panel

Supports paste text or read from chapters. Shows preview table
with checkboxes for selective import of characters, relationships,
factions, and events."
```

---

### Task 3: 集成 AI 提取按钮到世界观面板

**Files:**
- Modify: `src/components/Worldbuilding/WorldbuildingPanel.tsx`

- [ ] **Step 1: 在 WorldbuildingPanel 中添加 AI 提取按钮和 Modal**

在文件顶部 imports 中添加：
```typescript
import { RobotOutlined } from '@ant-design/icons';
import AIExtractModal from '../../features/worldbuilding/components/AIExtractModal';
```

在组件内部（`const stats = useWorldbuildingStats();` 之后）添加 state：
```typescript
const [extractModalVisible, setExtractModalVisible] = useState(false);
```

在 Tabs 组件的 `tabBarExtraContent` prop 中添加 AI 提取按钮。找到 `<Tabs` 标签，添加 prop：
```typescript
tabBarExtraContent={
  <Button
    type="primary"
    icon={<RobotOutlined />}
    size="small"
    onClick={() => setExtractModalVisible(true)}
    style={{ marginRight: 16 }}
  >
    AI 提取
  </Button>
}
```

在 `</Drawer>` 之后，`</div>` 之前添加 Modal：
```typescript
      <AIExtractModal
        visible={extractModalVisible}
        onClose={() => setExtractModalVisible(false)}
      />
```

注意：WorldbuildingPanel 目前没有接收 `projectPath` prop。如果需要"从章节提取"功能，需要通过 props 传入。但"粘贴文本"功能不需要。暂时不传 projectPath，后续可通过 context 或 props 补充。

- [ ] **Step 2: Commit**

```bash
git add src/components/Worldbuilding/WorldbuildingPanel.tsx
git commit -m "feat: add AI extract button to worldbuilding panel

Opens AIExtractModal when clicked. Placed in Tabs extra content area."
```

---

### Task 4: 编辑器浮动润色工具栏

**Files:**
- Create: `src/components/Editor/PolishToolbar.tsx`

- [ ] **Step 1: 创建 PolishToolbar 组件**

这是一个 React 组件，作为编辑器的浮动工具栏。当用户选中超过 10 个字符时显示。

```typescript
import React, { useState } from 'react';
import { Button, Space, Tooltip, Spin } from 'antd';
import { EditOutlined, ExpandOutlined, CompressOutlined, FormatPainterOutlined } from '@ant-design/icons';
import { aiTransform } from '../../lib/ai';

interface PolishToolbarProps {
  selectedText: string;
  position: { top: number; left: number };
  onApply: (newText: string) => void;
  onDismiss: () => void;
}

const PolishToolbar: React.FC<PolishToolbarProps> = ({ selectedText, position, onApply, onDismiss }) => {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleAction = async (action: 'polish' | 'expand' | 'condense' | 'restyle') => {
    setLoading(true);
    setPreview(null);
    try {
      const result = await aiTransform({ text: selectedText, action });
      setPreview(result);
    } catch (err) {
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  if (preview) {
    return (
      <div
        style={{
          position: 'absolute',
          top: position.top,
          left: position.left,
          zIndex: 1000,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: 12,
          maxWidth: 500,
          maxHeight: 300,
          overflow: 'auto',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
          AI 改写预览（Tab 接受 / Esc 取消）
        </div>
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{preview}</div>
        <Space style={{ marginTop: 8 }}>
          <Button size="small" type="primary" onClick={() => { onApply(preview); setPreview(null); }}>
            接受 (Tab)
          </Button>
          <Button size="small" onClick={() => { setPreview(null); onDismiss(); }}>
            取消 (Esc)
          </Button>
        </Space>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        zIndex: 1000,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '4px 8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      {loading ? (
        <Spin size="small" />
      ) : (
        <Space size={4}>
          <Tooltip title="润色">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleAction('polish')} />
          </Tooltip>
          <Tooltip title="扩写">
            <Button type="text" size="small" icon={<ExpandOutlined />} onClick={() => handleAction('expand')} />
          </Tooltip>
          <Tooltip title="缩写">
            <Button type="text" size="small" icon={<CompressOutlined />} onClick={() => handleAction('condense')} />
          </Tooltip>
          <Tooltip title="改风格">
            <Button type="text" size="small" icon={<FormatPainterOutlined />} onClick={() => handleAction('restyle')} />
          </Tooltip>
        </Space>
      )}
    </div>
  );
};

export default PolishToolbar;
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Editor/PolishToolbar.tsx
git commit -m "feat: add floating polish toolbar component

Shows polish/expand/condense/restyle buttons on text selection.
Displays AI result as inline preview with accept/cancel actions."
```

---

### Task 5: 集成润色工具栏到编辑器

**Files:**
- Modify: `src/components/Editor/Editor.tsx`

- [ ] **Step 1: 在 Editor.tsx 中集成 PolishToolbar**

需要在 Editor 组件中：

1. 添加 import：
```typescript
import PolishToolbar from './PolishToolbar';
```

2. 添加 state 来跟踪选区：
```typescript
const [selectionInfo, setSelectionInfo] = useState<{
  text: string;
  from: number;
  to: number;
  position: { top: number; left: number };
} | null>(null);
```

3. 在 CodeMirror extensions 中添加选区监听（在 useEffect 中 EditorView 创建后）：
```typescript
// 监听选区变化，显示润色工具栏
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
          left: coords.left - editorRect.left,
        },
      });
    }
  } else {
    setSelectionInfo(null);
  }
});
```

Add `selectionListener` to the extensions array.

4. 在 JSX 中，在 editor container div 内添加 PolishToolbar 的条件渲染：
```typescript
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
```

This is a complex integration — the implementer should READ the current Editor.tsx carefully to find the right insertion points for the extension and JSX.

- [ ] **Step 2: Commit**

```bash
git add src/components/Editor/Editor.tsx
git commit -m "feat: integrate polish toolbar into editor on text selection

Shows floating toolbar when 10+ characters selected. Accept replaces
selected text, dismiss clears the toolbar."
```

---

### Task 6: AI 对话世界观上下文注入

**Files:**
- Create: `src/features/worldbuilding/utils/buildWorldSummary.ts`
- Modify: `src/components/AIPanel/AIPanel.tsx`

- [ ] **Step 1: 创建 buildWorldSummary.ts**

```typescript
import { useCharacterStore } from '../store/characterStore';
import { useFactionStore } from '../store/factionStore';

/**
 * 构建世界观摘要字符串，用于注入到 AI 对话 system prompt
 */
export function buildWorldSummary(): string {
  const { characters, relationships } = useCharacterStore.getState();
  const { factions } = useFactionStore.getState();

  if (characters.length === 0 && factions.length === 0) {
    return '';
  }

  const lines: string[] = ['## 当前世界观设定'];

  if (characters.length > 0) {
    lines.push('');
    lines.push('### 人物');
    for (const char of characters.slice(0, 20)) {
      const tags = char.tags?.length ? `（${char.tags.join('、')}）` : '';
      lines.push(`- ${char.name}${tags}: ${char.description || '暂无描述'}`);
    }
    if (characters.length > 20) {
      lines.push(`- ...（共 ${characters.length} 个人物）`);
    }
  }

  if (relationships.length > 0) {
    lines.push('');
    lines.push('### 人物关系');
    for (const rel of relationships.slice(0, 15)) {
      const from = characters.find((c) => c.id === rel.from)?.name ?? '?';
      const to = characters.find((c) => c.id === rel.to)?.name ?? '?';
      lines.push(`- ${from} → ${to}: ${rel.type}${rel.description ? `（${rel.description}）` : ''}`);
    }
  }

  if (factions.length > 0) {
    lines.push('');
    lines.push('### 势力/组织');
    for (const faction of factions.slice(0, 10)) {
      lines.push(`- ${faction.name}: ${faction.description || '暂无描述'}`);
    }
  }

  return lines.join('\n');
}
```

- [ ] **Step 2: 在 AIPanel.tsx 的 system prompt 构建中注入世界观**

在 `src/components/AIPanel/AIPanel.tsx` 顶部添加 import：
```typescript
import { buildWorldSummary } from '../../features/worldbuilding/utils/buildWorldSummary';
```

找到 `sendMessage` 函数中构建 `systemPrompt` 的位置（约第 648-662 行）。在 `systemPrompt` 被赋值后，追加世界观上下文：

```typescript
      // 注入世界观上下文
      const worldSummary = buildWorldSummary();
      const finalSystemPrompt = worldSummary
        ? `${systemPrompt}\n\n${worldSummary}`
        : systemPrompt;
```

然后将后续 `aiChat` 调用中的 `systemPrompt` 参数改为 `finalSystemPrompt`。

- [ ] **Step 3: Commit**

```bash
git add src/features/worldbuilding/utils/buildWorldSummary.ts src/components/AIPanel/AIPanel.tsx
git commit -m "feat: inject worldbuilding context into AI chat system prompt

Builds a summary of characters, relationships, and factions from
the worldbuilding store and appends it to every AI chat request."
```

---

### Task 7: 验证 + 推送

**Files:** None (verification only)

- [ ] **Step 1: 验证 git 状态**

Run: `git status --short`
Expected: clean

- [ ] **Step 2: 运行现有测试**

Run: `node test-suite/run.mjs ai-engine-spawn`
Expected: PASS

- [ ] **Step 3: 推送到 GitHub**

```bash
git push origin main
```
