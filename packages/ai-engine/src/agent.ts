import { generateText } from 'ai'
import type { AgentResult, Message, ModelParameters, ToolCallRequest, ToolCallResult } from './types'
import { ProviderManager, validateProviderConfig } from './provider'
import { getToolsForSDK } from './tools'

export interface AgentContext {
  providerId: string
  parameters: ModelParameters
  systemPrompt: string
  // Tool 执行回调（由外部提供，实际执行在 Tauri）
  executeTools: (calls: ToolCallRequest[]) => Promise<ToolCallResult[]>
  // 中断信号
  abortSignal?: AbortSignal
}

export class Agent {
  private providerManager: ProviderManager

  constructor(providerManager: ProviderManager) {
    this.providerManager = providerManager
  }

  // P2 修复：验证模型参数
  private validateModelParameters(params: ModelParameters, providerId: string): void {
    if (!params) {
      throw new Error(`[Agent] Missing model parameters for provider '${providerId}'`)
    }
    if (!params.model || typeof params.model !== 'string' || params.model.trim() === '') {
      throw new Error(`[Agent] Invalid model name: model must be a non-empty string`)
    }
  }

  // P2 修复：验证消息数组
  private validateMessages(messages: Message[] | undefined, context: string): void {
    if (!Array.isArray(messages)) {
      throw new Error(`[Agent] ${context}: messages must be an array`)
    }
    // 检查每条消息的有效性
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i]
      if (!msg || typeof msg !== 'object') {
        throw new Error(`[Agent] ${context}: messages[${i}] is invalid`)
      }
      if (!msg.role || typeof msg.role !== 'string') {
        throw new Error(`[Agent] ${context}: messages[${i}] is missing or has invalid 'role'`)
      }
      if (!msg.content || typeof msg.content !== 'string') {
        throw new Error(`[Agent] ${context}: messages[${i}] is missing or has invalid 'content'`)
      }
    }
  }

  // 纯文本补全（不启用工具）
  async complete(messages: Message[], context: Omit<AgentContext, 'executeTools'>): Promise<AgentResult> {
    const provider = this.providerManager.getProvider(context.providerId)
    if (!provider) {
      throw new Error(`Provider not found: ${context.providerId}`)
    }

    // P2 修复：验证参数
    this.validateModelParameters(context.parameters, context.providerId)
    this.validateMessages(messages, 'complete')

    // P1 修复：安全访问 models 数组
    const models = provider.models
    if (Array.isArray(models) && models.length > 0 && !models.includes(context.parameters.model)) {
      throw new Error(
        `Model not allowed by provider (${context.providerId}): ${context.parameters.model}. Allowed models: ${models.join(', ')}`,
      )
    }

    const sdk = this.providerManager.createSDK(context.providerId)
    const model = sdk(context.parameters.model)

    const allMessages = [
      { role: 'system' as const, content: context.systemPrompt },
      ...messages.map((m) => ({
        role: m.role as any,
        content: m.content,
        toolCallId: m.toolCallId,
      })),
    ]

    const result = await generateText({
      model,
      messages: allMessages as any,
      maxSteps: 1,
      abortSignal: context.abortSignal,
      temperature: context.parameters.temperature,
      topP: context.parameters.topP,
      maxTokens: context.parameters.maxTokens,
    } as any)

    return {
      content: (result as any).text ?? '',
      toolCalls: [],
    }
  }

  // 运行 Agent
  async run(messages: Message[], context: AgentContext): Promise<AgentResult> {
    const provider = this.providerManager.getProvider(context.providerId)
    if (!provider) {
      throw new Error(`Provider not found: ${context.providerId}`)
    }

    // P2 修复：验证参数
    this.validateModelParameters(context.parameters, context.providerId)
    this.validateMessages(messages, 'run')

    // P1 修复：安全访问 models 数组
    const models = provider.models
    if (Array.isArray(models) && models.length > 0 && !models.includes(context.parameters.model)) {
      throw new Error(
        `Model not allowed by provider (${context.providerId}): ${context.parameters.model}. Allowed models: ${models.join(', ')}`,
      )
    }

    const sdk = this.providerManager.createSDK(context.providerId)
    const model = sdk(context.parameters.model)

    const allMessages = [
      { role: 'system' as const, content: context.systemPrompt },
      ...messages.map((m) => ({
        role: m.role as any,
        content: m.content,
        toolCallId: m.toolCallId,
      })),
    ]

    // 使用 Vercel AI SDK 的 generateText
    // 设置 maxSteps 让 SDK 自动处理多轮 tool calling
    const result = await generateText({
      model,
      messages: allMessages as any,
      tools: getToolsForSDK(context.executeTools) as any,
      maxSteps: 10,
      abortSignal: context.abortSignal,
      temperature: context.parameters.temperature,
      topP: context.parameters.topP,
      maxTokens: context.parameters.maxTokens,
    } as any)

    const toolCalls = (result as any).toolCalls as any[] | undefined

    return {
      content: (result as any).text ?? '',
      toolCalls: toolCalls?.map(
        (call): ToolCallRequest => ({
          id: call.toolCallId ?? call.id,
          name: call.toolName ?? call.name,
          args: call.args ?? call.arguments ?? {},
        }),
      ),
    }
  }
}
