# Creator Studio 开发计划

本文档整合 Creator Studio 完整开发计划，包含已规划的桌宠功能（墨灵）以及新增的功能模块。

---

## 一、已规划功能：桌宠化AI写作助手（墨灵）

> 参考文档：`墨灵开发计划.md`（保留原文档作为详细参考）

### 1.1 核心架构

| 创意方案功能 | 现有架构支撑 | 实现方式 |
|-------------|-------------|---------|
| 桌宠停靠组件 | MainLayout + CSS Grid | 新增 PetLayer 覆盖层 |
| 状态系统 | Zustand store | 新建 petStore |
| AI 会话能力 | lib/ai.ts + AIPanel | 复用现有 AI 能力 |
| 章节状态 | useChapterManager | 监听章节变化触发桌宠行为 |
| 写作统计 | StatusBar + wordCount | 复用或扩展 |
| 灵感气泡 | 新建组件 | Popup/Bubble 机制 |

### 1.2 开发阶段

| 里程碑 | 功能点 | 预计工时 |
|-------|-------|---------|
| Milestone 1 | 桌宠基础形态、心情状态、简单动画、灵感气泡基础版 | 1-2天 |
| Milestone 2 | 全部心情状态、写作统计、快捷操作、展开态面板 | 2-3天 |
| Milestone 3 | 集成到 MainLayout、性能优化、用户体验打磨 | 1-2天 |

---

## 二、新增功能模块

### Phase 4: 可视化世界观编辑器

> **优先级**: P1 | **预计工时**: 5-7天 | **依赖**: Phase 1-2 完成

#### 4.1 人物关系图谱

**功能描述**：提供可视化界面管理小说中的人物关系。

**实现方式**：
- 使用 D3.js 或 React Flow 实现节点连线图
- 支持创建人物节点（姓名、描述、头像）
- 支持关系连线（类型：亲友、敌对、爱慕等）
- 点击节点查看人物详情
- 拖拽调整布局

**数据结构设计**：
```typescript
interface Character {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  attributes: Record<string, string>;
}

interface Relationship {
  id: string;
  from: string;  // Character ID
  to: string;    // Character ID
  type: 'friend' | 'enemy' | 'love' | 'family' | 'rival' | 'other';
  description: string;
}
```

**文件清单**：
| 文件路径 | 用途 | 优先级 |
|---------|-----|-------|
| `src/features/worldbuilding/types/character.ts` | 人物类型定义 | P0 |
| `src/features/worldbuilding/store/characterStore.ts` | 人物状态管理 | P0 |
| `src/features/worldbuilding/components/CharacterGraph.tsx` | 关系图谱组件 | P0 |
| `src/features/worldbuilding/components/CharacterCard.tsx` | 人物卡片组件 | P0 |
| `src/features/worldbuilding/components/RelationshipEditor.tsx` | 关系编辑器 | P1 |

#### 4.2 势力分布图

**功能描述**：管理故事中的势力/组织结构。

**实现方式**：
- 树形或网状结构展示势力关系
- 支持势力成员列表
- 势力属性（地盘、实力、目标等）

#### 4.3 时间线管理

**功能描述**：管理故事的时间线和事件顺序。

**实现方式**：
- 水平/垂直时间轴展示
- 事件节点可拖拽排序
- 支持标注"伏笔"、"转折点"等标签
- 与章节关联

---

### Phase 5: 大纲冲突检测

> **优先级**: P2 | **预计工时**: 7-10天 | **依赖**: Phase 4 完成

#### 5.1 设定一致性检测

**功能描述**：自动分析大纲和正文中的设定冲突。

**检测范围**：
| 检测类型 | 示例 | 检测方式 |
|---------|-----|---------|
| 人物设定冲突 | 人物A的眼睛颜色前后不一致 | NLP + RAG |
| 战力体系崩坏 | 弱者击败强者无合理解释 | 规则引擎 + AI |
| 世界观矛盾 | 季节、地理等设定前后矛盾 | RAG + 知识图谱 |

#### 5.2 时间线错误检测

**功能描述**：检测故事中的时间线漏洞。

**检测范围**：
- 事件顺序矛盾
- 时间跨度不合理
- 节日/季节对应错误

#### 5.3 修改建议生成

**功能描述**：检测到冲突后提供修改建议。

**实现方式**：
- 调用 AI 分析冲突原因
- 生成 2-3 条修改建议
- 支持一键应用到相关章节

---

### Phase 6: 长文本连贯性保障

> **优先级**: P1 | **预计工时**: 8-12天 | **依赖**: Phase 3 完成

#### 6.1 设定记忆库

**功能描述**：支持百万级 Token 的长文本记忆，确保人设、场景、伏笔的一致性。

**技术方案**：
```typescript
interface MemoryConfig {
  maxTokens: number;           // 最大 Token 数
  embeddingModel: string;      // Embedding 模型
  retrievalTopK: number;       // 召回数量
  memoryCategories: MemoryCategory[];
}

type MemoryCategory = 
  | 'character'   // 人物设定
  | 'world'       // 世界观
  | 'plot'        // 剧情线
  | 'foreshadow'' // 伏笔
  | 'callback';   // 回收记录
```

**实现方式**：
- 使用 RAG 技术实现长期记忆检索
- 分类存储不同类型的设定
- 在 AI 对话时自动注入相关记忆

#### 6.2 伏笔追踪系统

**功能描述**：智能追踪剧情伏笔，标记未回收线索。

**数据结构**：
```typescript
interface Foreshadow {
  id: string;
  title: string;
  description: string;
  sourceChapterId: string;
  sourceText: string;
  status: 'active' | 'partial' | 'resolved';
  createdAt: number;
  resolvedAt?: number;
  relatedForeshadows: string[];
}
```

**参考 MuMuAINovel 实现**：
- 可视化伏笔时间线
- 伏笔回收提醒通知
- 与大纲冲突检测联动

#### 6.3 伏笔回收提醒

**功能描述**：在适当位置提醒作者回收伏笔。

**触发条件**：
- 章节进入"收尾"阶段
- 与伏笔相关的场景/人物出现
- 写作字数达到预设阈值

---

### Phase 7: 创作环境优化

> **优先级**: P2 | **预计工时**: 3-5天 | **依赖**: 无依赖

#### 7.1 色彩调节与护眼模式

**功能描述**：根据时间自动调整屏幕色温，减少视觉疲劳。

**实现方式**：
```typescript
interface EyeCareConfig {
  enabled: boolean;
  autoMode: boolean;          // 自动根据时间调整
  customColorTemp: number;    // 自定义色温值
  workHours: {
    start: string;           // "09:00"
    end: string;             // "18:00"
  };
  warmColorTemp: number;      // 暖色调温
  coolColorTemp: number;      // 冷色调温
}
```

**技术实现**：
- 使用 CSS filter 实现色温调整
- 支持跟随系统日落时间
- 可配置开关和色温强度

#### 7.2 背景音效与白噪音

**功能描述**：提供创作环境音效，帮助作者进入心流状态。

**音效类型**：
| 类型 | 场景 | 音效示例 |
|-----|-----|---------|
| 图书馆 | 安静创作 | 翻书声、空调声 |
| 咖啡厅 | 轻松创作 | 咖啡机声、人声低语 |
| 雨夜 | 氛围创作 | 雨声、雷声 |
| 自然 | 放松 | 鸟鸣、流水 |

**技术实现**：
- Web Audio API 播放背景音效
- 音效混音支持
- 音量独立控制

#### 7.3 写作仪式感构建

**功能描述**：支持自定义写作仪式，增强创作专注力。

**功能点**：
- 打字音效（机械键盘、古典打字机等）
- 写作进度可视化动画
- 专注计时器（番茄钟）
- 完成奖励动画

---

## 四、完整里程碑规划

| 阶段 | 里程碑 | 主要功能 | 预计工时 | 优先级 | 状态 |
|-----|-------|---------|---------|-------|------|
| Phase 1-3 | 墨灵桌宠 MVP | 桌宠基础、心情系统、灵感气泡 | 4-7天 | P0 | ✅ 已完成 |
| Phase 4 | 世界观编辑器 | 人物图谱、势力分布、时间线 | 5-7天 | P1 | ✅ 已完成 |
| Phase 5 | 冲突检测 | 设定检测、时间线检测 | 7-10天 | P2 | 🔄 进行中 |
| Phase 6 | 连贯性保障 | 记忆库、伏笔追踪 | 8-12天 | P1 | ⏳ 待开发 |
| Phase 7 | 环境优化 | 护眼模式、白噪音、仪式感 | 3-5天 | P2 | ⏳ 待开发 |

---

## 四.1 Bug 修复任务

### AI 引擎启动失败修复

> **问题描述**：用户在使用 MSI 安装包安装后，经常出现"发送失败：AI引擎启动失败..."的错误
> **影响范围**：用户体验、打包发布
> **优先级**: P0 | **状态**: ✅ 已修复

**根本原因**：
- MSI 打包后 `find_bundled_ai_engine` 函数的搜索路径包含无效路径 `../Resources`
- 在 Windows 上该路径可能解析到错误位置导致查找失败

**解决方案**：
1. ✅ 简化 `find_bundled_ai_engine` 函数，只搜索正确路径 (`bin/` 和根目录)
2. ✅ 添加详细的调试日志 `[ai-bridge]` 前缀，便于排查问题
3. ✅ 创建 `ai-engine-packaging` 测试用例验证打包完整性

**诊断方法**：
- 安装 0.1.18 版本后检查应用日志
- 搜索 `[ai-bridge]` 前缀的日志输出
- 确认 ai-engine 是否被正确找到

---

## 四、参考项目：MuMuAINovel 功能对照

| MuMuAINovel 功能 | Creator Studio 对应 | 备注 |
|-----------------|--------------------|------|
| 灵感模式 | 桌宠灵感气泡 | 整合到桌宠 |
| 角色关系图谱 | Phase 4 人物关系图谱 | 直接实现 |
| 伏笔管理 | Phase 6 伏笔追踪系统 | 增强实现 |
| 职业等级体系 | 世界观子系统 | 作为人物属性扩展 |
| 思维链与章节关系图谱 | Phase 5 冲突检测 | 扩展实现 |
| 自定义写作风格 | writingPresets.ts | 已有，扩展 |
| Prompt 调整界面 | 提示词模板 | 后期考虑 |
| 拆书功能 | - | 独特功能考虑 |

---

## 五、技术风险与缓解

| 风险 | 影响 | 缓解措施 |
|-----|-----|---------|
| 关系图谱性能 | 中 | 使用虚拟化列表，按需加载 |
| RAG 长文本检索 | 高 | 分层索引 + 向量召回 |
| AI 冲突误报 | 中 | 人工确认机制，积累样本 |
| 多音效同步 | 低 | Web Audio API 统一管理 |
| 色温调整兼容性 | 低 | 提供关闭选项 |

---

## 六、验收标准

### 通用标准
1. 功能可独立开关，不影响核心写作体验
2. 与现有编辑器、AI 面板无缝集成
3. 性能影响 < 5%（通过性能监控验证）
4. 支持暗黑/明亮主题

### Phase 4 验收
- [x] 人物关系图谱支持增删改查
- [x] 支持多种关系类型可视化
- [x] 势力分布图展示正确
- [x] 时间线可拖拽排序
- [x] 导航栏集成世界观入口
- [x] 全屏模式布局优化

### Phase 5 验收
- [ ] 可检测出设定矛盾
- [ ] 误报率 < 20%
- [ ] 修改建议有参考价值

### Phase 6 验收
- [ ] 支持 100 万 Token 记忆检索
- [ ] 伏笔回收提醒准确
- [ ] 伏笔状态追踪正确

### Phase 7 验收
- [ ] 护眼模式正常切换
- [ ] 音效无延迟播放
- [ ] 仪式感动画流畅
