# AI 配置简化方案

## 背景

当前 API 配置流程对用户过于复杂，需要理解 Provider、Base URL、Provider Type 等概念。

### 当前流程（7步）

1. 打开设置
2. 添加 Provider
3. 填写名称
4. 填写 Base URL
5. 选择 Provider 类型
6. 填写 API Key
7. 刷新模型
8. 切换 Tab 配置模型
9. 选择模型
10. 保存

### 用户期望（1-2步）

1. 输入 API Key
2. 开始使用

---

## 设计目标

**用户只需要提供 API Key，其余全部自动处理。**

### 核心原则

1. **零配置体验**：用户只需输入 API Key
2. **智能识别**：自动检测 API Key 所属服务商
3. **推荐优先**：自动推荐最适合的模型
4. **渐进披露**：保留高级配置入口，但不强制用户填写

---

## 技术方案

### 1. Provider 预设

```typescript
// src/features/settings/providerPresets.ts

export interface ProviderPreset {
  id: string;                    // 唯一标识
  name: string;                  // 显示名称
  baseUrl: string;              // API Base URL
  providerType: string;          // openai-compatible | google | anthropic
  authType: string;              // Bearer | x-api-key | x-goog-api-key
  keyPattern: RegExp;             // API Key 格式识别正则
  keyExample: string;            // 示例 Key（脱敏）
  recommendedModels: string[];    // 推荐模型列表
  logo?: string;                 // Logo URL
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: "deepseek",
    name: "Deepseek",
    baseUrl: "https://api.deepseek.com/v1",
    providerType: "openai-compatible",
    authType: "Bearer",
    keyPattern: /^sk-[a-zA-Z0-9]{32,}$/,
    keyExample: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    recommendedModels: ["deepseek-chat", "deepseek-coder"],
  },
  {
    id: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    providerType: "openai-compatible",
    authType: "Bearer",
    keyPattern: /^sk-[a-zA-Z0-9]{48,}$/,
    keyExample: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    recommendedModels: ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"],
  },
  {
    id: "anthropic",
    name: "Anthropic (Claude)",
    baseUrl: "https://api.anthropic.com",
    providerType: "anthropic",
    authType: "x-api-key",
    keyPattern: /^sk-ant-[a-zA-Z0-9-]{50,}$/,
    keyExample: "sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    recommendedModels: ["claude-3-5-haiku-20241022", "claude-3-5-sonnet-20241022"],
  },
  {
    id: "google",
    name: "Google (Gemini)",
    baseUrl: "https://generativelanguage.googleapis.com",
    providerType: "google",
    authType: "x-goog-api-key",
    keyPattern: /^[a-zA-Z0-9_-]{35,}$/,
    keyExample: "AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    recommendedModels: ["gemini-1.5-flash", "gemini-1.5-pro"],
  },
  {
    id: "zhipu",
    name: "智谱 AI",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    providerType: "openai-compatible",
    authType: "Bearer",
    keyPattern: /^[a-zA-Z0-9]{24,}$/,
    keyExample: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    recommendedModels: ["glm-4", "glm-4-flash", "glm-4-plus"],
  },
  {
    id: "siliconflow",
    name: "SiliconFlow",
    baseUrl: "https://api.siliconflow.cn/v1",
    providerType: "openai-compatible",
    authType: "Bearer",
    keyPattern: /^sk-[a-zA-Z0-9]{48,}$/,
    keyExample: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    recommendedModels: ["Qwen/Qwen2.5-7B-Instruct", "deepseek-ai/DeepSeek-V2.5"],
  },
  {
    id: "dashscope",
    name: "阿里云百炼",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    providerType: "openai-compatible",
    authType: "Bearer",
    keyPattern: /^sk-[a-zA-Z0-9]{48,}$/,
    keyExample: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    recommendedModels: ["qwen-plus", "qwen-turbo", "qwen-max"],
  },
  {
    id: "custom",
    name: "自定义",
    baseUrl: "",
    providerType: "openai-compatible",
    authType: "Bearer",
    keyPattern: /.*/,
    keyExample: "",
    recommendedModels: [],
  },
];

/**
 * 根据 API Key 自动识别 Provider
 */
export function detectProvider(apiKey: string): ProviderPreset | null {
  if (!apiKey || apiKey.length < 10) return null;
  
  for (const preset of PROVIDER_PRESETS) {
    if (preset.id === "custom") continue;
    if (preset.keyPattern.test(apiKey)) {
      return preset;
    }
  }
  
  return null;
}

/**
 * 根据 ID 获取 Provider 预设
 */
export function getPresetById(id: string): ProviderPreset | null {
  return PROVIDER_PRESETS.find(p => p.id === id) ?? null;
}
```

### 2. 简化配置 Store

```typescript
// src/features/settings/store/quickConfigStore.ts

import { create } from "zustand";
import { 
  PROVIDER_PRESETS, 
  detectProvider, 
  type ProviderPreset 
} from "../providerPresets";
import {
  type Provider,
  getConfig,
  addProvider,
  setActiveProvider,
  refreshProviderModels,
  setDefaultParameters,
} from "../../../platform/tauri/client";

interface QuickConfigState {
  // 输入状态
  apiKey: string;
  selectedPresetId: string;
  selectedModel: string;
  customBaseUrl: string;
  isRememberMe: boolean;
  
  // 检测状态
  detectedPreset: ProviderPreset | null;
  isDetecting: boolean;
  
  // 加载状态
  isLoading: boolean;
  isRefreshingModels: boolean;
  error: string | null;
  
  // Actions
  setApiKey: (key: string) => void;
  setSelectedPreset: (id: string) => void;
  setSelectedModel: (model: string) => void;
  setCustomBaseUrl: (url: string) => void;
  setIsRememberMe: (remember: boolean) => void;
  
  // 业务 Actions
  quickSetup: () => Promise<void>;
  refreshModels: () => Promise<void>;
  reset: () => void;
}

export const useQuickConfigStore = create<QuickConfigState>((set, get) => ({
  // 初始状态
  apiKey: "",
  selectedPresetId: "custom",
  selectedModel: "",
  customBaseUrl: "",
  isRememberMe: true,
  detectedPreset: null,
  isDetecting: false,
  isLoading: false,
  isRefreshingModels: false,
  error: null,
  
  setApiKey: (key) => {
    set({ apiKey: key, isDetecting: true });
    
    // 防抖检测
    setTimeout(() => {
      const preset = detectProvider(key);
      set({
        detectedPreset: preset,
        isDetecting: false,
        selectedPresetId: preset?.id ?? "custom",
        selectedModel: preset?.recommendedModels[0] ?? "",
      });
    }, 300);
  },
  
  setSelectedPreset: (id) => {
    const preset = PROVIDER_PRESETS.find(p => p.id === id);
    set({
      selectedPresetId: id,
      selectedModel: preset?.recommendedModels[0] ?? "",
      customBaseUrl: preset?.baseUrl ?? "",
    });
  },
  
  setSelectedModel: (model) => set({ selectedModel: model }),
  setCustomBaseUrl: (url) => set({ customBaseUrl: url }),
  setIsRememberMe: (remember) => set({ isRememberMe: remember }),
  
  quickSetup: async () => {
    const { selectedPresetId, apiKey, selectedModel, customBaseUrl, isRememberMe } = get();
    
    if (!apiKey) {
      set({ error: "请输入 API Key" });
      return;
    }
    
    if (!selectedModel) {
      set({ error: "请选择模型" });
      return;
    }
    
    set({ isLoading: true, error: null });
    
    try {
      const preset = PROVIDER_PRESETS.find(p => p.id === selectedPresetId);
      if (!preset) throw new Error("未找到 Provider 预设");
      
      const baseUrl = preset.id === "custom" ? customBaseUrl : preset.baseUrl;
      
      // 创建 Provider
      const provider: Provider = {
        id: `provider_${Date.now()}`,
        name: preset.name,
        base_url: baseUrl,
        provider_type: preset.providerType,
        headers: preset.authType === "Bearer" ? {} : {},
        models: [],
        models_updated_at: null,
      };
      
      await addProvider(provider, apiKey);
      
      // 如果是记住我，设为默认
      if (isRememberMe) {
        await setActiveProvider(provider.id);
        await setDefaultParameters({
          model: selectedModel,
          temperature: 0.7,
          top_p: 0.9,
          top_k: null,
          max_tokens: 2000,
        });
      }
      
      // 刷新模型列表（后台进行）
      get().refreshModels();
      
      set({ isLoading: false });
    } catch (error) {
      set({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  },
  
  refreshModels: async () => {
    const { selectedPresetId, apiKey } = get();
    if (!apiKey) return;
    
    set({ isRefreshingModels: true });
    
    try {
      // 从已有 Provider 获取或创建临时 Provider
      const config = await getConfig();
      const existingProvider = config.providers.find(
        p => p.name === PROVIDER_PRESETS.find(pr => pr.id === selectedPresetId)?.name
      );
      
      if (existingProvider) {
        await refreshProviderModels(existingProvider.id);
      }
    } catch (error) {
      // 静默失败，不影响主流程
    } finally {
      set({ isRefreshingModels: false });
    }
  },
  
  reset: () => set({
    apiKey: "",
    selectedPresetId: "custom",
    selectedModel: "",
    customBaseUrl: "",
    detectedPreset: null,
    error: null,
  }),
}));
```

### 3. 简化配置 UI

```tsx
// src/features/settings/QuickConfigPanel.tsx

import { useEffect } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  Select,
  Space,
  Tag,
  Typography,
  Alert,
  Spin,
  Divider,
} from "antd";
import { 
  KeyOutlined, 
  CheckCircleOutlined,
  LoadingOutlined,
  RocketOutlined,
} from "@ant-design/icons";
import { useQuickConfigStore } from "./store/quickConfigStore";
import { PROVIDER_PRESETS } from "./providerPresets";

const { Text, Paragraph } = Typography;

export function QuickConfigPanel() {
  const {
    apiKey,
    selectedPresetId,
    selectedModel,
    customBaseUrl,
    detectedPreset,
    isDetecting,
    isLoading,
    error,
    setApiKey,
    setSelectedPreset,
    setSelectedModel,
    setCustomBaseUrl,
    quickSetup,
  } = useQuickConfigStore();
  
  const selectedPreset = PROVIDER_PRESETS.find(p => p.id === selectedPresetId);
  const showCustomUrl = selectedPresetId === "custom";
  
  return (
    <div style={{ padding: 24, maxWidth: 500, margin: "0 auto" }}>
      {/* 标题 */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <RocketOutlined style={{ fontSize: 48, color: "#1890ff" }} />
        <h2 style={{ marginTop: 16 }}>快速配置 AI</h2>
        <Text type="secondary">
          输入 API Key，自动配置，立即使用
        </Text>
      </div>
      
      {/* API Key 输入 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Form layout="vertical">
          <Form.Item 
            label="API Key"
            required
            tooltip="您的 API Key 将安全存储在系统密钥链中"
          >
            <Input.Password
              size="large"
              placeholder="请输入 API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              prefix={<KeyOutlined />}
              suffix={
                isDetecting ? (
                  <Spin indicator={<LoadingOutlined spin />} />
                ) : detectedPreset ? (
                  <Tag color="success">{detectedPreset.name}</Tag>
                ) : null
              }
            />
          </Form.Item>
          
          {/* 自动检测提示 */}
          {detectedPreset && (
            <Alert
              type="success"
              showIcon
              icon={<CheckCircleOutlined />}
              message={`已识别为 ${detectedPreset.name}`}
              description={`将自动配置 ${detectedPreset.baseUrl}`}
              style={{ marginBottom: 16 }}
            />
          )}
        </Form>
      </Card>
      
      {/* 服务商选择（可手动切换） */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Form layout="vertical">
          <Form.Item label="服务商">
            <Select
              value={selectedPresetId}
              onChange={setSelectedPreset}
              options={PROVIDER_PRESETS.map(p => ({
                value: p.id,
                label: (
                  <Space>
                    <span>{p.name}</span>
                    {p.id === "custom" && (
                      <Tag>自定义</Tag>
                    )}
                  </Space>
                ),
              }))}
            />
          </Form.Item>
          
          {/* 自定义 URL */}
          {showCustomUrl && (
            <Form.Item 
              label="API 地址"
              required
              tooltip="AI 服务商的 API Base URL"
            >
              <Input
                placeholder="https://api.example.com/v1"
                value={customBaseUrl}
                onChange={(e) => setCustomBaseUrl(e.target.value)}
              />
            </Form.Item>
          )}
          
          {/* 模型选择 */}
          <Form.Item 
            label="模型"
            required
            tooltip="如需指定模型可手动输入"
          >
            {selectedPreset && selectedPreset.recommendedModels.length > 0 ? (
              <Select
                value={selectedModel}
                onChange={setSelectedModel}
                options={[
                  {
                    value: "",
                    label: "推荐模型",
                    type: "group",
                  },
                  ...selectedPreset.recommendedModels.map(m => ({
                    value: m,
                    label: `✨ ${m}`,
                  })),
                  {
                    value: "__custom__",
                    label: "手动输入",
                    type: "group",
                  },
                ]}
                onChange={(value) => {
                  if (value === "__custom__") {
                    setSelectedModel("");
                  } else {
                    setSelectedModel(value);
                  }
                }}
                placeholder="选择或输入模型"
                showSearch
                allowClear
                mode={undefined}
              />
            ) : (
              <Input
                placeholder="输入模型名称，如 gpt-4o-mini"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
              />
            )}
          </Form.Item>
          
          {/* 模型输入（当选择自定义时） */}
          {selectedPresetId === "custom" && (
            <Form.Item>
              <Input
                placeholder="手动输入模型名称"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
              />
            </Form.Item>
          )}
        </Form>
      </Card>
      
      {/* 错误提示 */}
      {error && (
        <Alert
          type="error"
          message="配置失败"
          description={error}
          style={{ marginBottom: 16 }}
          closable
          onClose={() => useQuickConfigStore.getState().reset()}
        />
      )}
      
      {/* 提交按钮 */}
      <Button
        type="primary"
        size="large"
        block
        loading={isLoading}
        disabled={!apiKey || !selectedModel}
        onClick={() => quickSetup()}
        icon={<RocketOutlined />}
      >
        保存并开始使用
      </Button>
      
      {/* 高级选项入口 */}
      <Divider plain>
        <Text type="secondary" style={{ fontSize: 12 }}>
          需要更多配置？
        </Text>
      </Divider>
      
      <Button
        type="link"
        block
        onClick={() => {
          // 切换到高级配置面板
        }}
      >
        展开高级配置
      </Button>
      
      {/* 安全提示 */}
      <Paragraph type="secondary" style={{ textAlign: "center", marginTop: 24, fontSize: 12 }}>
        🔒 您的 API Key 安全存储在系统密钥链中<br/>
        不会与任何人共享
      </Paragraph>
    </div>
  );
}
```

---

## UI 设计

### 入口：首次使用引导

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                      🚀                                     │
│                                                             │
│                    快速配置 AI                               │
│                                                             │
│         输入 API Key，自动配置，立即使用                      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 🔑  API Key                                         │  │
│  │ [sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx     ] 🔄 │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│          ✅ 已识别为 Deepseek                              │
│          将自动配置 https://api.deepseek.com/v1           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  服务商: Deepseek                               ▼   │  │
│  │                                                      │  │
│  │  模型: ✨ deepseek-chat                         ▼   │  │
│  │        ✨ deepseek-coder                            │  │
│  │        手动输入...                                   │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│              [ 保存并开始使用 ]                             │
│                                                             │
│                    需要更多配置？                           │
│                  [ 展开高级配置 ]                           │
│                                                             │
│         🔒 您的 API Key 安全存储在系统密钥链中              │
│            不会与任何人共享                                 │
└─────────────────────────────────────────────────────────────┘
```

### 入口：设置页面

```
┌─────────────────────────────────────────────────────────────┐
│  设置                                                         │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  [🤖 AI 配置]  [📝 编辑器]  [🎨 外观]                        │
│                                                              │
│  ┌──────────────────┐  ┌────────────────────────────────┐  │
│  │ 快速配置          │  │                                │  │
│  │ ────────────────  │  │    [快速配置面板]              │  │
│  │ [当前: Deepseek]  │  │                                │  │
│  │ 模型: qwen-plus   │  │                                │  │
│  │                  │  │                                │  │
│  │ [重新配置]       │  │                                │  │
│  └──────────────────┘  └────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 实现计划

### Phase 1: 核心功能

- [ ] 创建 `providerPresets.ts` - Provider 预设定义
- [ ] 创建 `quickConfigStore.ts` - 简化配置状态管理
- [ ] 创建 `QuickConfigPanel.tsx` - 简化配置 UI
- [ ] 更新 `AIConfigPanel.tsx` - 集成快速配置

### Phase 2: 体验优化

- [ ] 添加 API Key 检测动画
- [ ] 添加成功配置动画
- [ ] 添加模型列表自动刷新

### Phase 3: 高级配置

- [ ] 保留高级配置入口
- [ ] 支持多 Provider 管理
- [ ] 支持 Provider 导入/导出

---

## 附录：支持的 Provider 列表

| ID | 名称 | Base URL | 推荐模型 |
|----|------|----------|----------|
| deepseek | Deepseek | `api.deepseek.com/v1` | deepseek-chat, deepseek-coder |
| openai | OpenAI | `api.openai.com/v1` | gpt-4o-mini, gpt-4o |
| anthropic | Claude | `api.anthropic.com` | claude-3-5-haiku, claude-3-5-sonnet |
| google | Gemini | `generativelanguage.googleapis.com` | gemini-1.5-flash, gemini-1.5-pro |
| zhipu | 智谱 AI | `open.bigmodel.cn/api/paas/v4` | glm-4, glm-4-flash |
| siliconflow | SiliconFlow | `api.siliconflow.cn/v1` | Qwen2.5-7B-Instruct |
| dashscope | 阿里云百炼 | `dashscope.aliyuncs.com/compatible-mode/v1` | qwen-plus, qwen-turbo |
| custom | 自定义 | 用户指定 | 用户指定 |
