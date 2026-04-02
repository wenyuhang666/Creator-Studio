# Creator-Studio AI 引擎稳定化 + Pipeline 重构设计

> 日期：2026-04-02
> 状态：已批准
> 作者：Infty + Link

## 背景

Creator-Studio 是一个基于 Tauri 的 AI 辅助小说创作工具。PR #2（V0.1.18）合并后，项目面临以下问题：

1. AI 引擎打包不稳定，跨平台路径查找不一致
2. 对话框调用大模型读取路径时有崩溃现象（Mac + Windows）
3. 仓库中混入了大量构建缓存和二进制文件（.vite/、release/、94MB ONNX 模型）
4. CSP 被完全禁用，非 Bearer API Key 明文写入磁盘
5. AI 引擎架构缺乏可扩展性，新增功能需要改三层代码

同时需要新增以下功能：
- 行内补全优化（类 Copilot 体验，面向不懂 AI 的合作者）
- AI 自动生成世界观图谱（从文本提取人物/关系/势力/时间线）
- 润色功能（选中文本 → AI 改写 → inline diff 预览）

## 分阶段实施

### Phase 0：仓库清理 + 安全修复

#### 0.1 .gitignore 补全

新增以下规则并从 git 索引中移除已跟踪文件：

```
.vite/
release/
.creatorai/rag/models/
tasks/
bug/
editor-harness.html
```

执行 `git rm -r --cached` 移除索引中的文件（不删磁盘）。

#### 0.2 CSP 修复

将 `src-tauri/tauri.conf.json` 中的 `"csp": null` 改为：

```json
"csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://* http://localhost:*; img-src 'self' data: blob:"
```

#### 0.3 API Key 明文修复

修改 `src/features/settings/store/quickConfigStore.ts`，所有类型的 API Key 都通过 `keyring_store` 存储。`Provider.headers` 中不再包含凭证，认证 header 在运行时从 keyring 读取后动态构造。

#### 0.4 useTheme 状态同步

将 `src/hooks/useTheme` 从 `useState` 改为 Zustand store，确保 `App.tsx` 和 `AppProviders.tsx` 共享同一实例。

#### 0.5 editorRef 修复

`src/layouts/MainLayout.tsx` 第 48 行：

```typescript
// Before
const editorRef = { current: null as EditorHandle | null };
// After
const editorRef = useRef<EditorHandle | null>(null);
```

---

### Phase 1：AI 引擎稳定化

#### 1.1 打包问题修复

- `find_bundled_ai_engine` 启动时一次性打印所有候选路径及其存在性
- `build.rs` 增加构建后验证步骤：检查 sidecar 文件确实存在于预期位置
- 补充 `ai-engine-packaging` 测试用例，覆盖 macOS `.app` 和 Windows MSI 两种打包结构

#### 1.2 对话崩溃修复

**崩溃根因分析（三条路径）：**

1. AI Engine 进程启动失败 → `spawn_ai_engine` 返回 Err → 前端未优雅处理
2. JSONL 解析失败 → AI Engine 输出非 JSON 内容（如 Node.js 报错）→ `serde_json::from_str` panic
3. 工具调用路径问题 → AI 模型生成绝对路径或 `../` → 工具执行返回 error → 模型循环重试

**修复方案：**

- `run_chat_with_events` 中 JSONL 解析加 `match` 守卫，非法 JSON 行记录日志后跳过
- AI Engine spawn 失败时返回用户友好错误（区分"找不到 ai-engine"和"Node.js 未安装"）
- 工具执行错误超过 3 次连续失败时，主动中止循环并返回已有内容
- 前端 `AIPanel.tsx` 的 `catch` 块增加错误分类显示

#### 1.3 测试用例补充

基于现有 `test-suite/run.mjs` 框架新增：

| 测试套件 | 验证目标 |
|----------|----------|
| `ai-engine-spawn` | 各种路径下 AI Engine 能否正常启动和响应 |
| `ai-engine-tool-safety` | 工具调用路径校验（绝对路径、`../`、符号链接） |
| `ai-engine-error-recovery` | JSONL 协议异常恢复（畸形 JSON、空行、超时） |

---

### Phase 2：AI 引擎 Pipeline 重构

#### 2.1 AI Engine 端架构

```
packages/ai-engine/src/
├── cli.ts                    # 入口：JSONL 协议 + Pipeline 路由
├── core/
│   ├── engine.ts             # ProviderManager（不变）
│   ├── pipeline.ts           # Pipeline 接口定义
│   └── registry.ts           # Pipeline 注册表
├── pipelines/
│   ├── chat.ts               # 对话 + 工具调用（迁移）
│   ├── complete.ts           # 行内补全（迁移）
│   ├── compact.ts            # 消息压缩（迁移）
│   ├── extract.ts            # 文本分析 → 结构化输出（新）
│   ├── transform.ts          # 润色/改写（新）
│   └── fetch-models.ts       # 模型列表（迁移）
└── tools/
    └── tools.ts              # 工具定义（不变）
```

**Pipeline 接口：**

```typescript
interface PipelineContext {
  provider: ProviderConfig;
  parameters: ModelParameters;
  messages?: Message[];
  input?: string;
  options?: Record<string, unknown>;
  executeTools?: ToolExecutor;
  abortSignal?: AbortSignal;
}

interface PipelineResult {
  content: string;
  structured?: unknown;  // extract pipeline 返回结构化数据
  toolCalls?: ToolCallRequest[];
}

interface Pipeline {
  name: string;
  useTools: boolean;
  buildSystemPrompt(context: PipelineContext): string;
  run(context: PipelineContext): Promise<PipelineResult>;
  postProcess?(output: string): PipelineResult;
}
```

`cli.ts` 简化为：收到 JSONL 请求 → 按 `type` 字段查找 Pipeline → 调用 `pipeline.run()` → 返回结果。

#### 2.2 Rust 端拆分

将 `ai_bridge.rs`（1300+ 行）拆为：

```
src-tauri/src/ai/
├── mod.rs                # 模块入口
├── engine_manager.rs     # AI Engine 进程生命周期（spawn/kill/restart）
├── protocol.rs           # JSONL 协议读写
├── tool_executor.rs      # 工具沙箱执行
└── pipelines.rs          # Pipeline 请求分发（Tauri commands）
```

`ai_bridge.rs` 保留为兼容层，逐步废弃。

#### 2.3 行内补全优化

- AI Engine 端加请求去抖：500ms 内的重复请求只保留最后一个
- 前端端加缓存：相同前文 hash 的补全结果缓存 30s
- 超时从 30s 降到 8s，超时则静默失败（不弹错误）

---

### Phase 3：AI 驱动世界观 + 润色功能

#### 3.1 世界观自动生成

**工作流：**

1. 用户在世界观面板点击「AI 提取」
2. 选择范围（当前章节 / 全部章节 / 粘贴文本）
3. 调用 `extract` Pipeline
4. AI 返回结构化 JSON
5. 前端展示预览（哪些人物/关系要新增）
6. 用户确认后写入 worldbuilding store

**extract Pipeline system prompt 核心指令：**

```
分析以下小说文本，提取：
1. 人物（name, description, role, tags）
2. 人物关系（from, to, type, description）
3. 势力/组织（name, description, attributes）
4. 关键事件（title, description, type, characters, time）

输出严格 JSON 格式。
```

**增量更新逻辑：**
- 人物名模糊匹配现有 store（名字相同 = 同一人物）
- 匹配到的人物：合并新属性（不覆盖用户手动编辑的字段）
- 未匹配到的：作为新增候选，需用户确认

**前端 UI：**
`WorldbuildingPanel` 顶部「AI 提取」按钮 → Modal（选范围 → loading → 预览表格 → 确认导入）

#### 3.2 润色功能

**交互设计：**

1. 编辑器中选中文本 → 浮动工具栏出现
2. 点击「润色」/「扩写」/「缩写」/「改风格」
3. 调用 `transform` Pipeline
4. 编辑器中显示 inline diff（红删绿增）
5. Tab 接受 / Esc 拒绝

**实现：**
- CodeMirror tooltip 监听选区变化，选中超过 10 字符时显示工具栏
- `transform` Pipeline 返回改写后文本
- CodeMirror Decoration 显示 diff 预览
- 快捷键：`Cmd+Shift+P`（可在设置中关闭）

#### 3.3 世界观与 AI 对话联动

在 AI 对话的 system prompt 中注入当前世界观摘要：

```
## 当前世界观设定
人物：张三（主角，性格内向）、李四（反派，前同事）
关系：张三 ← 竞争对手 → 李四
势力：星辰公司 vs 暗影集团
```

数据来源：worldbuilding store 实时快照，每次发送对话时动态拼接。

---

## 实施顺序

| Phase | 内容 | 预估工作量 |
|-------|------|-----------|
| 0 | 仓库清理 + 安全修复 | 小 |
| 1 | AI 引擎稳定化（打包 + 崩溃 + 测试） | 中 |
| 2 | Pipeline 重构 + 行内补全优化 | 大 |
| 3 | 世界观自动生成 + 润色 + 对话联动 | 大 |

Phase 0-1 为基础保障，必须先完成。Phase 2-3 可以按 Pipeline 粒度增量交付。
