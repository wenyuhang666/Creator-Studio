// Provider 配置
export interface ProviderConfig {
  id: string
  name: string
  baseURL: string
  apiKey: string
  models: string[]
  providerType: 'openai-compatible' | 'google' | 'anthropic'
  headers?: Record<string, string>
}

// 模型参数
export interface ModelParameters {
  model: string
  temperature?: number
  topP?: number
  topK?: number
  maxTokens?: number
}

// Tool 定义
export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, any> // JSON Schema
}

// Tool 调用请求
export interface ToolCallRequest {
  id: string
  name: string
  args: Record<string, any>
}

// Tool 调用结果
export interface ToolCallResult {
  id: string
  result: string
  error?: string
}

// 消息
export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  toolCallId?: string
}

// Agent 运行结果
export interface AgentResult {
  content: string
  toolCalls?: ToolCallRequest[]
}

// Pipeline 上下文
export interface PipelineContext {
  provider: ProviderConfig;
  parameters: ModelParameters;
  systemPrompt?: string;
  messages?: Message[];
  input?: string;
  options?: Record<string, unknown>;
}

// Pipeline 输出
export interface PipelineResult {
  type: string;
  content?: string;
  structured?: unknown;
  models?: string[];
  toolCalls?: ToolCallRequest[];
}

// Pipeline JSONL 输入基础类型
export interface PipelineInput {
  type: string;
  [key: string]: unknown;
}
