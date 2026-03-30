/**
 * Provider 预设
 *
 * 内置主流 AI 服务商的配置信息，
 * 支持 API Key 格式自动识别
 */

export interface ProviderPreset {
  /** 唯一标识 */
  id: string;
  /** 显示名称 */
  name: string;
  /** API Base URL */
  baseUrl: string;
  /** Provider 类型 */
  providerType: "openai-compatible" | "google" | "anthropic";
  /** 认证类型 */
  authType: "Bearer" | "x-api-key" | "x-goog-api-key";
  /** API Key 格式识别正则 */
  keyPattern: RegExp;
  /** 示例 Key（脱敏） */
  keyExample: string;
  /** 推荐模型列表 */
  recommendedModels: string[];
  /** Logo URL */
  logo?: string;
}

/**
 * Provider 预设列表
 */
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
    id: "ollama",
    name: "Ollama (本地)",
    baseUrl: "http://localhost:11434/v1",
    providerType: "openai-compatible",
    authType: "Bearer",
    keyPattern: /^$/, // Ollama 不需要 API Key
    keyExample: "（无需 API Key）",
    recommendedModels: ["llama3", "qwen2.5-coder", "codellama"],
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
    if (preset.id === "custom" || preset.id === "ollama") continue;
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
  return PROVIDER_PRESETS.find((p) => p.id === id) ?? null;
}

/**
 * 获取需要 API Key 的预设列表
 */
export function getPresetsRequiringKey(): ProviderPreset[] {
  return PROVIDER_PRESETS.filter((p) => p.id !== "ollama" && p.id !== "custom");
}
