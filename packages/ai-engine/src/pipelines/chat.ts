import { createEngine } from '../index'
import type { Pipeline, PipelineRuntime } from '../core/pipeline'
import type { ProviderConfig, ModelParameters, Message, ToolCallRequest, ToolCallResult } from '../types'

export class ChatPipeline implements Pipeline {
  readonly name = 'chat'

  async run(input: Record<string, unknown>, runtime: PipelineRuntime): Promise<Record<string, unknown>> {
    // P0/P1 修复：验证必需输入字段
    const provider = input.provider as ProviderConfig | undefined
    const parameters = input.parameters as ModelParameters | undefined
    const systemPrompt = input.systemPrompt as string | undefined
    const messages = input.messages as Message[] | undefined

    // 验证 provider 配置
    if (!provider) {
      throw new Error('Missing required field: provider configuration is required')
    }
    if (!provider.id || !provider.name || !provider.baseURL || !provider.providerType) {
      throw new Error(`Invalid provider configuration: missing required fields (id, name, baseURL, providerType)`)
    }
    if (provider.providerType === 'openai-compatible' && (!provider.apiKey || provider.apiKey.trim() === '')) {
      throw new Error(`Provider '${provider.id}' (openai-compatible) is missing required 'apiKey' field`)
    }

    // 验证 parameters 配置
    if (!parameters || typeof parameters !== 'object') {
      throw new Error('Missing required field: parameters configuration is required')
    }
    if (!parameters.model || typeof parameters.model !== 'string') {
      throw new Error('Missing required field: parameters.model must be a non-empty string')
    }

    // 验证 messages
    if (!Array.isArray(messages)) {
      throw new Error('Missing required field: messages must be an array')
    }
    if (messages.length === 0) {
      throw new Error('Messages array is empty. At least one message is required.')
    }

    // 验证每条消息
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i]
      if (!msg || typeof msg !== 'object') {
        throw new Error(`Invalid message at index ${i}: message must be an object`)
      }
      if (!msg.role || typeof msg.role !== 'string') {
        throw new Error(`Invalid message at index ${i}: 'role' must be a non-empty string`)
      }
      if (!msg.content || typeof msg.content !== 'string') {
        throw new Error(`Invalid message at index ${i}: 'content' must be a string`)
      }
    }

    const engine = createEngine()
    engine.providerManager.addProvider(provider)

    const result = await engine.agent.run(messages, {
      providerId: provider.id,
      parameters,
      systemPrompt: systemPrompt ?? '',
      executeTools: async (calls: ToolCallRequest[]) => {
        // P0-2 修复：如果没有工具调用，直接返回空数组，避免死锁
        if (!calls || calls.length === 0) {
          return [];
        }
        
        runtime.writeOutput({ type: 'tool_call', calls })
        const resultInput = (await runtime.readInput()) as { type: string; results: ToolCallResult[] }
        
        if (resultInput.type !== 'tool_result') {
          throw new Error(`Expected tool_result, got: ${resultInput.type}. Input: ${JSON.stringify(resultInput)}`)
        }
        
        if (!Array.isArray(resultInput.results)) {
          throw new Error(`Invalid tool_result: results must be array, got: ${typeof resultInput.results}`)
        }
        
        return resultInput.results
      },
    })

    return { type: 'done', content: result.content, toolCalls: result.toolCalls }
  }
}
