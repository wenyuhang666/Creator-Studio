import { describe, expect, test, beforeEach, vi } from 'bun:test'
import { ProviderManager } from './provider'
import type { ProviderConfig } from './types'

// Mock @ai-sdk/openai-compatible
vi.mock('@ai-sdk/openai-compatible', () => ({
  createOpenAICompatible: vi.fn(() => {
    return vi.fn(() => 'mock-model-instance')
  }),
}))

describe('ProviderManager', () => {
  let providerManager: ProviderManager

  beforeEach(() => {
    providerManager = new ProviderManager()
    vi.clearAllMocks()
  })

  // ========== 添加 Provider 测试 ==========

  describe('addProvider', () => {
    test('应该成功添加 OpenAI-compatible provider', () => {
      const config: ProviderConfig = {
        id: 'openai-test',
        name: 'OpenAI Test',
        baseURL: 'https://api.openai.com/v1',
        apiKey: 'sk-test-key',
        models: ['gpt-4', 'gpt-3.5-turbo'],
        providerType: 'openai-compatible',
      }

      providerManager.addProvider(config)
      const result = providerManager.getProvider('openai-test')

      expect(result).toBeDefined()
      expect(result?.id).toBe('openai-test')
      expect(result?.name).toBe('OpenAI Test')
      expect(result?.apiKey).toBe('sk-test-key')
    })

    test('应该成功添加 Google provider', () => {
      const config: ProviderConfig = {
        id: 'google-test',
        name: 'Google Test',
        baseURL: 'https://generativelanguage.googleapis.com',
        apiKey: 'google-api-key',
        models: ['gemini-pro'],
        providerType: 'google',
      }

      providerManager.addProvider(config)
      const result = providerManager.getProvider('google-test')

      expect(result).toBeDefined()
      expect(result?.providerType).toBe('google')
    })

    test('应该成功添加 Anthropic provider', () => {
      const config: ProviderConfig = {
        id: 'anthropic-test',
        name: 'Anthropic Test',
        baseURL: 'https://api.anthropic.com',
        apiKey: 'sk-ant-api-key',
        models: ['claude-3-sonnet'],
        providerType: 'anthropic',
      }

      providerManager.addProvider(config)
      const result = providerManager.getProvider('anthropic-test')

      expect(result).toBeDefined()
      expect(result?.providerType).toBe('anthropic')
    })

    test('应该能够覆盖已存在的 provider', () => {
      const config1: ProviderConfig = {
        id: 'test-provider',
        name: 'Original Name',
        baseURL: 'http://localhost/v1',
        apiKey: 'key1',
        models: [],
        providerType: 'openai-compatible',
      }

      const config2: ProviderConfig = {
        id: 'test-provider',
        name: 'Updated Name',
        baseURL: 'http://localhost/v2',
        apiKey: 'key2',
        models: [],
        providerType: 'openai-compatible',
      }

      providerManager.addProvider(config1)
      providerManager.addProvider(config2)

      const result = providerManager.getProvider('test-provider')
      expect(result?.name).toBe('Updated Name')
      expect(result?.baseURL).toBe('http://localhost/v2')
    })
  })

  // ========== 获取 Provider 测试 ==========

  describe('getProvider', () => {
    test('应该返回已添加的 provider', () => {
      const config: ProviderConfig = {
        id: 'get-test',
        name: 'Get Test',
        baseURL: 'http://localhost/v1',
        apiKey: 'test-key',
        models: [],
        providerType: 'openai-compatible',
      }

      providerManager.addProvider(config)
      const result = providerManager.getProvider('get-test')

      expect(result).toBeDefined()
      expect(result?.id).toBe('get-test')
    })

    test('应该返回 undefined 当 provider 不存在', () => {
      const result = providerManager.getProvider('non-existent')
      expect(result).toBeUndefined()
    })
  })

  // ========== 列出 Provider 测试 ==========

  describe('listProviders', () => {
    test('应该返回空数组当没有 provider', () => {
      const result = providerManager.listProviders()
      expect(result).toEqual([])
    })

    test('应该返回所有已添加的 provider', () => {
      providerManager.addProvider({
        id: 'provider-1',
        name: 'Provider 1',
        baseURL: 'http://localhost/1',
        apiKey: 'key1',
        models: [],
        providerType: 'openai-compatible',
      })

      providerManager.addProvider({
        id: 'provider-2',
        name: 'Provider 2',
        baseURL: 'http://localhost/2',
        apiKey: 'key2',
        models: [],
        providerType: 'google',
      })

      const result = providerManager.listProviders()
      expect(result.length).toBe(2)
      expect(result.map((p) => p.id)).toContain('provider-1')
      expect(result.map((p) => p.id)).toContain('provider-2')
    })
  })

  // ========== 创建 SDK 测试 ==========

  describe('createSDK', () => {
    test('应该成功为 OpenAI-compatible provider 创建 SDK', () => {
      providerManager.addProvider({
        id: 'sdk-test-openai',
        name: 'OpenAI',
        baseURL: 'https://api.openai.com/v1',
        apiKey: 'sk-test-key',
        models: [],
        providerType: 'openai-compatible',
      })

      const sdk = providerManager.createSDK('sdk-test-openai')
      expect(sdk).toBeDefined()
      expect(typeof sdk).toBe('function')
    })

    test('应该成功为 Google provider 创建 SDK', () => {
      providerManager.addProvider({
        id: 'sdk-test-google',
        name: 'Google',
        baseURL: 'https://generativelanguage.googleapis.com',
        apiKey: 'google-api-key',
        models: [],
        providerType: 'google',
      })

      const sdk = providerManager.createSDK('sdk-test-google')
      expect(sdk).toBeDefined()
    })

    test('应该成功为 Anthropic provider 创建 SDK', () => {
      providerManager.addProvider({
        id: 'sdk-test-anthropic',
        name: 'Anthropic',
        baseURL: 'https://api.anthropic.com',
        apiKey: 'sk-ant-api-key',
        models: [],
        providerType: 'anthropic',
      })

      const sdk = providerManager.createSDK('sdk-test-anthropic')
      expect(sdk).toBeDefined()
    })

    test('应该抛出错误当 provider 不存在时创建 SDK', () => {
      expect(() => providerManager.createSDK('non-existent')).toThrow(
        'Provider not found: non-existent',
      )
    })

    test('应该合并自定义 headers', () => {
      providerManager.addProvider({
        id: 'headers-test',
        name: 'Headers Test',
        baseURL: 'http://localhost/v1',
        apiKey: 'test-key',
        models: [],
        providerType: 'openai-compatible',
        headers: {
          'X-Custom-Header': 'custom-value',
          'X-Another-Header': 'another-value',
        },
      })

      const sdk = providerManager.createSDK('headers-test')
      expect(sdk).toBeDefined()
    })

    test('应该处理没有 apiKey 的 provider', () => {
      providerManager.addProvider({
        id: 'no-key-test',
        name: 'No Key Test',
        baseURL: 'http://localhost/v1',
        apiKey: '',
        models: [],
        providerType: 'openai-compatible',
      })

      const sdk = providerManager.createSDK('no-key-test')
      expect(sdk).toBeDefined()
    })
  })

  // ========== 边界情况测试 ==========

  describe('边界情况', () => {
    test('应该处理带空格的 provider id', () => {
      providerManager.addProvider({
        id: 'provider with spaces',
        name: 'Space Test',
        baseURL: 'http://localhost/v1',
        apiKey: 'key',
        models: [],
        providerType: 'openai-compatible',
      })

      const result = providerManager.getProvider('provider with spaces')
      expect(result).toBeDefined()
    })

    test('应该处理特殊字符的 provider id', () => {
      const specialId = 'provider_123-abc.test'
      providerManager.addProvider({
        id: specialId,
        name: 'Special Test',
        baseURL: 'http://localhost/v1',
        apiKey: 'key',
        models: [],
        providerType: 'openai-compatible',
      })

      const result = providerManager.getProvider(specialId)
      expect(result).toBeDefined()
    })
  })
})
