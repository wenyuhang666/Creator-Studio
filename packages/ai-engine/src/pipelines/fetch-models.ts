import { fetchModels } from '../models'
import type { Pipeline, PipelineRuntime } from '../core/pipeline'

export class FetchModelsPipeline implements Pipeline {
  readonly name = 'fetch_models'

  async run(input: Record<string, unknown>, _runtime: PipelineRuntime): Promise<Record<string, unknown>> {
    // P0/P1 修复：验证必需输入字段
    const baseURL = input.baseURL as string | undefined
    const apiKey = input.apiKey as string | undefined
    const providerType = (input.providerType as string) ?? 'openai-compatible'

    // 验证 baseURL
    if (!baseURL || typeof baseURL !== 'string' || baseURL.trim() === '') {
      throw new Error('Missing required field: baseURL must be a non-empty string')
    }

    // 验证 providerType
    const validProviderTypes = ['openai-compatible', 'google', 'anthropic']
    if (!validProviderTypes.includes(providerType)) {
      throw new Error(`Invalid providerType '${providerType}'. Expected one of: ${validProviderTypes.join(', ')}`)
    }

    // apiKey 对于 openai-compatible 是可选的（某些 API 可能不需要）
    // 但我们应该提醒用户如果没有设置可能会失败
    if (!apiKey || apiKey.trim() === '') {
      console.warn('Warning: apiKey is empty, some model fetching endpoints may fail')
    }

    const models = await fetchModels(baseURL, apiKey ?? '', providerType)
    return { type: 'models', models }
  }
}
