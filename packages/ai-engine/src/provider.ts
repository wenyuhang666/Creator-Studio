import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { ProviderConfig } from './types'

/**
 * 验证 Provider 配置的必需字段
 * @throws Error 如果配置无效，抛出包含具体错误信息的异常
 */
export function validateProviderConfig(provider: ProviderConfig, context?: string): void {
  const ctx = context ? `[${context}] ` : ''
  
  if (!provider) {
    throw new Error(`${ctx}Provider configuration is missing or undefined`)
  }
  
  if (!provider.id || typeof provider.id !== 'string') {
    throw new Error(`${ctx}Provider 'id' is required and must be a non-empty string`)
  }
  
  if (!provider.name || typeof provider.name !== 'string') {
    throw new Error(`${ctx}Provider '${provider.id}' is missing required field 'name'`)
  }
  
  if (!provider.baseURL || typeof provider.baseURL !== 'string') {
    throw new Error(`${ctx}Provider '${provider.id}' is missing required field 'baseURL'`)
  }
  
  // 验证 providerType
  const validProviderTypes = ['openai-compatible', 'google', 'anthropic']
  if (!provider.providerType || !validProviderTypes.includes(provider.providerType)) {
    throw new Error(`${ctx}Provider '${provider.id}' has invalid 'providerType'. Expected one of: ${validProviderTypes.join(', ')}`)
  }
  
  // openai-compatible 类型需要 apiKey
  if (provider.providerType === 'openai-compatible') {
    if (!provider.apiKey || typeof provider.apiKey !== 'string' || provider.apiKey.trim() === '') {
      throw new Error(`${ctx}Provider '${provider.id}' (openai-compatible) is missing required 'apiKey' field`)
    }
  }
}

function buildAuthHeaders(providerType: ProviderConfig['providerType'], apiKey: string): Record<string, string> {
  const key = apiKey ?? ''
  if (!key) return {}

  switch (providerType) {
    case 'google':
      return { 'x-goog-api-key': key }
    case 'anthropic':
      return { 'x-api-key': key }
    default:
      return {}
  }
}

export class ProviderManager {
  private providers: Map<string, ProviderConfig> = new Map()

  // 添加 Provider
  addProvider(config: ProviderConfig): void {
    this.providers.set(config.id, config)
  }

  // 获取 Provider
  getProvider(id: string): ProviderConfig | undefined {
    return this.providers.get(id)
  }

  // 列出所有 Provider
  listProviders(): ProviderConfig[] {
    return [...this.providers.values()]
  }

  // 创建 AI SDK 实例
  createSDK(providerId: string): ReturnType<typeof createOpenAICompatible> {
    const provider = this.providers.get(providerId)
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`)
    }

    // 验证必需的配置字段
    validateProviderConfig(provider, `SDK creation for '${providerId}'`)

    // We use the OpenAI-compatible protocol for all providers here,
    // but some providers expect different auth headers.
    const authHeaders = buildAuthHeaders(provider.providerType, provider.apiKey ?? '')
    const mergedHeaders = { ...authHeaders, ...(provider.headers ?? {}) }

    return createOpenAICompatible({
      baseURL: provider.baseURL,
      name: provider.name,
      // For Google/Anthropic, omit apiKey to avoid sending `Authorization: Bearer ...`
      // (some gateways treat Bearer tokens differently and may require browser verification).
      apiKey: provider.providerType === 'openai-compatible' ? provider.apiKey : undefined,
      headers: mergedHeaders,
    })
  }
}
