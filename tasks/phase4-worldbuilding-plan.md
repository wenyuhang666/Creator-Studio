# Phase 4：可视化世界观编辑器开发计划

> 创建时间：2026-03-31
> 项目经理：project-manager
> 预计完成：5-7 天

---

## 📋 任务总览

**项目**：Creator Studio - Phase 4 可视化世界观编辑器
**优先级**：P1
**依赖**：Phase 1-2 完成

### 三大核心模块

1. **人物关系图谱** (P0) - 预计 2-3 天
2. **势力分布图** (P1) - 预计 1.5-2 天
3. **时间线管理** (P1) - 预计 1.5-2 天

---

## 🎯 验收标准

- [ ] 人物关系图谱支持增删改查
- [ ] 支持多种关系类型可视化
- [ ] 势力分布图展示正确
- [ ] 时间线可拖拽排序
- [ ] 所有模块可独立开关
- [ ] 与现有编辑器无缝集成
- [ ] 性能影响 < 5%

---

## 📊 执行计划

### Day 1：架构设计与类型定义

| 任务 | 负责人 | 状态 | 输出 |
|-----|-------|------|------|
| 架构设计 | software-architect | ⏳ 待开始 | 架构文档 |
| 类型定义 | software-engineer-dev | ⏳ 待开始 | 类型文件 |
| 依赖配置 | chief-engineer | ⏳ 待开始 | package.json 更新 |

### Day 2-3：人物关系图谱开发

| 任务 | 负责人 | 状态 | 输出 |
|-----|-------|------|------|
| 状态管理 | software-engineer-dev | ⏳ 待开始 | characterStore.ts |
| 图谱组件 | software-engineer-feature | ⏳ 待开始 | CharacterGraph.tsx |
| 人物卡片 | software-engineer-feature | ⏳ 待开始 | CharacterCard.tsx |
| 关系编辑 | software-engineer-feature | ⏳ 待开始 | RelationshipEditor.tsx |

### Day 4：势力分布图开发

| 任务 | 负责人 | 状态 | 输出 |
|-----|-------|------|------|
| 状态管理 | software-engineer-feature | ⏳ 待开始 | factionStore.ts |
| 势力树形 | software-engineer-feature | ⏳ 待开始 | FactionTree.tsx |
| 势力详情 | software-engineer-feature | ⏳ 待开始 | FactionDetail.tsx |

### Day 5：时间线管理开发

| 任务 | 负责人 | 状态 | 输出 |
|-----|-------|------|------|
| 状态管理 | software-engineer-feature | ⏳ 待开始 | timelineStore.ts |
| 时间线组件 | software-engineer-feature | ⏳ 待开始 | Timeline.tsx |
| 事件卡片 | software-engineer-feature | ⏳ 待开始 | EventCard.tsx |

### Day 6-7：测试与集成

| 任务 | 负责人 | 状态 | 输出 |
|-----|-------|------|------|
| 测试用例 | test-engineer | ⏳ 待开始 | 测试文件 |
| 代码审查 | chief-engineer | ⏳ 待开始 | 审查报告 |
| 集成测试 | project-manager | ⏳ 待开始 | 集成报告 |

---

## 📁 文件清单

### 类型定义
- `src/features/worldbuilding/types/character.ts`
- `src/features/worldbuilding/types/faction.ts`
- `src/features/worldbuilding/types/timeline.ts`
- `src/features/worldbuilding/types/index.ts`

### 状态管理
- `src/features/worldbuilding/store/characterStore.ts`
- `src/features/worldbuilding/store/factionStore.ts`
- `src/features/worldbuilding/store/timelineStore.ts`
- `src/features/worldbuilding/store/index.ts`

### 组件
- `src/features/worldbuilding/components/CharacterGraph.tsx`
- `src/features/worldbuilding/components/CharacterCard.tsx`
- `src/features/worldbuilding/components/RelationshipEditor.tsx`
- `src/features/worldbuilding/components/FactionTree.tsx`
- `src/features/worldbuilding/components/FactionDetail.tsx`
- `src/features/worldbuilding/components/Timeline.tsx`
- `src/features/worldbuilding/components/EventCard.tsx`
- `src/features/worldbuilding/components/index.ts`

### 入口文件
- `src/features/worldbuilding/index.ts`

---

## 🔧 技术选型

### 图可视化库
- **选择**：`@xyflow/react` (React Flow)
- **原因**：专为 React 设计的节点连线图库，文档完善，性能优秀

### 状态管理
- **选择**：Zustand
- **原因**：项目已使用 Zustand，保持一致性

### 时间处理
- **选择**：dayjs
- **原因**：轻量级日期处理库

---

## ⚠️ 风险与应对

| 风险 | 影响 | 缓解措施 |
|-----|-----|---------|
| 关系图谱性能 | 中 | 使用虚拟化列表，按需加载 |
| 多人协作冲突 | 低 | 后期考虑添加冲突解决机制 |

---

## 📝 更新日志

| 日期 | 更新内容 | 更新人 |
|-----|---------|-------|
| 2026-03-31 | 创建计划文档 | project-manager |
