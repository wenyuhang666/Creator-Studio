import { createEngine } from '../index'
import type { Pipeline, PipelineRuntime } from '../core/pipeline'
import type { ProviderConfig, ModelParameters, Message } from '../types'

export class CompletePipeline implements Pipeline {
  readonly name = 'complete'

  async run(input: Record<string, unknown>, _runtime: PipelineRuntime): Promise<Record<string, unknown>> {
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
      if (typeof msg.content !== 'string') {
        throw new Error(`Invalid message at index ${i}: 'content' must be a string`)
      }
    }

    const engine = createEngine()
    engine.providerManager.addProvider(provider)

    const result = await engine.agent.complete(messages, {
      providerId: provider.id,
      parameters,
      systemPrompt: systemPrompt ?? '',
    })

    return { type: 'done', content: result.content }
  }
}
