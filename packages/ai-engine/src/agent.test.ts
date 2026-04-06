import { describe, expect, test, beforeEach, vi } from 'bun:test'
import { Agent, type AgentContext } from './agent'
import { ProviderManager } from './provider'
import type { Message, ProviderConfig, ToolCallRequest, ToolCallResult } from './types'

// Mock the 'ai' module
const mockGenerateText = vi.fn()
vi.mock('ai', () => ({
  generateText: (...args: unknown[]) => mockGenerateText(...args),
}))

describe('Agent', () => {
  let providerManager: ProviderManager
  let agent: Agent

  const mockProvider: ProviderConfig = {
    id: 'test-provider',
    name: 'Test Provider',
    baseURL: 'http://localhost/v1',
    apiKey: 'test-key',
    models: ['test-model', 'another-model'],
    providerType: 'openai-compatible',
  }

  const mockContext: Omit<AgentContext, 'executeTools'> = {
    providerId: 'test-provider',
    parameters: {
      model: 'test-model',
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 1000,
    },
    systemPrompt: 'You are a helpful assistant.',
  }

  const mockExecuteTools = async (calls: ToolCallRequest[]): Promise<ToolCallResult[]> => {
    return calls.map((call) => ({
      id: call.id,
      result: JSON.stringify({ success: true, tool: call.name }),
    }))
  }

  beforeEach(() => {
    vi.clearAllMocks()
    providerManager = new ProviderManager()
    providerManager.addProvider(mockProvider)
    agent = new Agent(providerManager)
  })

  // ========== complete 函数测试 ==========

  describe('complete 函数', () => {
    test('应该成功执行纯文本补全', async () => {
      const mockResult = {
        text: 'Hello! How can I help you?',
        toolCalls: [],
      }
      mockGenerateText.mockResolvedValue(mockResult)

      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
      ]

      const result = await agent.complete(messages, mockContext)

      expect(result.content).toBe('Hello! How can I help you?')
      expect(result.toolCalls).toEqual([])
      expect(mockGenerateText).toHaveBeenCalledTimes(1)
    })

    test('应该正确传递 system prompt', async () => {
      const customContext: Omit<AgentContext, 'executeTools'> = {
        ...mockContext,
        systemPrompt: 'You are a pirate assistant. Speak like a pirate.',
      }

      mockGenerateText.mockResolvedValue({ text: 'Ahoy there!' })

      const messages: Message[] = [{ role: 'user', content: 'Hi' }]
      await agent.complete(messages, customContext)

      const callArgs = mockGenerateText.mock.calls[0][0] as { messages: Array<{ role: string; content: string }> }
      expect(callArgs.messages[0]).toEqual({
        role: 'system',
        content: 'You are a pirate assistant. Speak like a pirate.',
      })
    })

    test('应该正确设置 maxSteps 为 1', async () => {
      mockGenerateText.mockResolvedValue({ text: 'response' })

      const messages: Message[] = [{ role: 'user', content: 'Hi' }]
      await agent.complete(messages, mockContext)

      const callArgs = mockGenerateText.mock.calls[0][0] as { maxSteps: number }
      expect(callArgs.maxSteps).toBe(1)
    })
  })

  // ========== run 函数测试 ==========

  describe('run 函数', () => {
    test('应该成功执行带工具调用的对话', async () => {
      const mockResult = {
        text: 'I found some information.',
        toolCalls: [
          {
            toolCallId: 'call-123',
            toolName: 'read',
            args: { path: 'chapter1.txt' },
          },
        ],
      }
      mockGenerateText.mockResolvedValue(mockResult)

      const messages: Message[] = [
        { role: 'user', content: 'Read the first chapter' },
      ]

      const context: AgentContext = {
        ...mockContext,
        executeTools: mockExecuteTools,
      }

      const result = await agent.run(messages, context)

      expect(result.content).toBe('I found some information.')
      expect(result.toolCalls).toHaveLength(1)
      expect(result.toolCalls![0].name).toBe('read')
    })

    test('应该正确处理多个 tool calls', async () => {
      const mockResult = {
        text: 'Done!',
        toolCalls: [
          { toolCallId: 'call-1', toolName: 'read', args: { path: 'file1.txt' } },
          { toolCallId: 'call-2', toolName: 'write', args: { path: 'file2.txt', content: 'new content' } },
        ],
      }
      mockGenerateText.mockResolvedValue(mockResult)

      const context: AgentContext = {
        ...mockContext,
        executeTools: mockExecuteTools,
      }

      const result = await agent.run([], context)

      expect(result.toolCalls).toHaveLength(2)
      expect(result.toolCalls![0].name).toBe('read')
      expect(result.toolCalls![1].name).toBe('write')
    })
  })

  // ========== Provider 错误处理测试 ==========

  describe('Provider 不存在时的错误处理', () => {
    test('complete 应该抛出 Provider not found 错误', async () => {
      const invalidContext: Omit<AgentContext, 'executeTools'> = {
        providerId: 'non-existent-provider',
        parameters: { model: 'test-model' },
        systemPrompt: 'test',
      }

      await expect(agent.complete([], invalidContext)).rejects.toThrow(
        'Provider not found: non-existent-provider',
      )
    })

    test('run 应该抛出 Provider not found 错误', async () => {
      const invalidContext: AgentContext = {
        providerId: 'non-existent-provider',
        parameters: { model: 'test-model' },
        systemPrompt: 'test',
        executeTools: mockExecuteTools,
      }

      await expect(agent.run([], invalidContext)).rejects.toThrow(
        'Provider not found: non-existent-provider',
      )
    })

    test('createSDK 应该抛出 Provider not found 错误', () => {
      expect(() => providerManager.createSDK('non-existent')).toThrow(
        'Provider not found: non-existent',
      )
    })
  })

  // ========== Model 限制测试 ==========

  describe('Model 不允许时的错误处理', () => {
    test('complete 应该拒绝不在允许列表中的 model', async () => {
      const restrictedContext: Omit<AgentContext, 'executeTools'> = {
        ...mockContext,
        parameters: {
          ...mockContext.parameters,
          model: 'forbidden-model',
        },
      }

      await expect(agent.complete([], restrictedContext)).rejects.toThrow(
        'Model not allowed by provider (test-provider): forbidden-model',
      )
    })

    test('run 应该拒绝不在允许列表中的 model', async () => {
      const restrictedContext: AgentContext = {
        ...mockContext,
        parameters: {
          ...mockContext.parameters,
          model: 'another-forbidden',
        },
        executeTools: mockExecuteTools,
      }

      await expect(agent.run([], restrictedContext)).rejects.toThrow(
        'Model not allowed by provider (test-provider): another-forbidden',
      )
    })

    test('应该允许空的 models 列表（无限制）', async () => {
      // 创建一个无 models 限制的 provider
      const unlimitedProvider: ProviderConfig = {
        ...mockProvider,
        id: 'unlimited-provider',
        models: [], // 空列表表示无限制
      }
      providerManager.addProvider(unlimitedProvider)

      const unlimitedContext: Omit<AgentContext, 'executeTools'> = {
        providerId: 'unlimited-provider',
        parameters: {
          model: 'any-model',
        },
        systemPrompt: 'Test',
      }

      mockGenerateText.mockResolvedValue({ text: 'OK' })

      const result = await agent.complete([], unlimitedContext)
      expect(result.content).toBe('OK')
    })
  })

  // ========== AbortSignal 测试 ==========

  describe('AbortSignal 中断', () => {
    test('complete 应该传递 abortSignal', async () => {
      mockGenerateText.mockResolvedValue({ text: 'response' })

      const abortController = new AbortController()
      const contextWithAbort: Omit<AgentContext, 'executeTools'> = {
        ...mockContext,
        abortSignal: abortController.signal,
      }

      const messages: Message[] = [{ role: 'user', content: 'Hi' }]
      await agent.complete(messages, contextWithAbort)

      const callArgs = mockGenerateText.mock.calls[0][0] as { abortSignal: AbortSignal }
      expect(callArgs.abortSignal).toBe(abortController.signal)
    })

    test('run 应该传递 abortSignal', async () => {
      mockGenerateText.mockResolvedValue({ text: 'response' })

      const abortController = new AbortController()
      const contextWithAbort: AgentContext = {
        ...mockContext,
        abortSignal: abortController.signal,
        executeTools: mockExecuteTools,
      }

      await agent.run([], contextWithAbort)

      const callArgs = mockGenerateText.mock.calls[0][0] as { abortSignal: AbortSignal }
      expect(callArgs.abortSignal).toBe(abortController.signal)
    })
  })

  // ========== 参数传递测试 ==========

  describe('参数传递', () => {
    test('应该正确传递 temperature 参数', async () => {
      mockGenerateText.mockResolvedValue({ text: 'test' })

      const customContext: Omit<AgentContext, 'executeTools'> = {
        ...mockContext,
        parameters: {
          ...mockContext.parameters,
          temperature: 1.5,
        },
      }

      await agent.complete([], customContext)

      const callArgs = mockGenerateText.mock.calls[0][0] as { temperature: number }
      expect(callArgs.temperature).toBe(1.5)
    })

    test('应该正确传递 topP 参数', async () => {
      mockGenerateText.mockResolvedValue({ text: 'test' })

      const customContext: Omit<AgentContext, 'executeTools'> = {
        ...mockContext,
        parameters: {
          ...mockContext.parameters,
          topP: 0.95,
        },
      }

      await agent.complete([], customContext)

      const callArgs = mockGenerateText.mock.calls[0][0] as { topP: number }
      expect(callArgs.topP).toBe(0.95)
    })

    test('应该正确传递 maxTokens 参数', async () => {
      mockGenerateText.mockResolvedValue({ text: 'test' })

      const customContext: Omit<AgentContext, 'executeTools'> = {
        ...mockContext,
        parameters: {
          ...mockContext.parameters,
          maxTokens: 2000,
        },
      }

      await agent.complete([], customContext)

      const callArgs = mockGenerateText.mock.calls[0][0] as { maxTokens: number }
      expect(callArgs.maxTokens).toBe(2000)
    })

    test('应该处理缺少可选参数的情况', async () => {
      mockGenerateText.mockResolvedValue({ text: 'test' })

      const minimalContext: Omit<AgentContext, 'executeTools'> = {
        providerId: 'test-provider',
        parameters: {
          model: 'test-model',
          // temperature, topP, maxTokens 都未设置
        },
        systemPrompt: 'Test',
      }

      await agent.complete([], minimalContext)

      const callArgs = mockGenerateText.mock.calls[0][0] as { temperature?: number; topP?: number; maxTokens?: number }
      expect(callArgs.temperature).toBeUndefined()
      expect(callArgs.topP).toBeUndefined()
      expect(callArgs.maxTokens).toBeUndefined()
    })
  })

  // ========== 消息格式测试 ==========

  describe('消息格式', () => {
    test('应该正确格式化用户消息', async () => {
      mockGenerateText.mockResolvedValue({ text: 'response' })

      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
      ]

      await agent.complete(messages, mockContext)

      const callArgs = mockGenerateText.mock.calls[0][0] as { messages: Array<{ role: string; content: string }> }
      const userMessage = callArgs.messages.find((m) => m.content === 'Hello')
      expect(userMessage!.role).toBe('user')
    })

    test('应该正确格式化助手消息', async () => {
      mockGenerateText.mockResolvedValue({ text: 'response' })

      const messages: Message[] = [
        { role: 'assistant', content: 'I am here to help.' },
      ]

      await agent.complete(messages, mockContext)

      const callArgs = mockGenerateText.mock.calls[0][0] as { messages: Array<{ role: string; content: string }> }
      const assistantMessage = callArgs.messages.find((m) => m.content === 'I am here to help.')
      expect(assistantMessage!.role).toBe('assistant')
    })

    test('应该保留 toolCallId', async () => {
      mockGenerateText.mockResolvedValue({ text: 'response' })

      const messages: Message[] = [
        { role: 'tool', content: 'file content', toolCallId: 'call-123' },
      ]

      await agent.complete(messages, mockContext)

      const callArgs = mockGenerateText.mock.calls[0][0] as { messages: Array<{ toolCallId?: string }> }
      const toolMessage = callArgs.messages.find((m) => m.toolCallId === 'call-123')
      expect(toolMessage!).toBeDefined()
      expect(toolMessage!.toolCallId).toBe('call-123')
    })
  })

  // ========== 边界情况测试 ==========

  describe('边界情况', () => {
    test('应该处理空消息数组', async () => {
      mockGenerateText.mockResolvedValue({ text: 'response' })

      const result = await agent.complete([], mockContext)

      expect(result.content).toBe('response')
      expect(mockGenerateText).toHaveBeenCalledTimes(1)
    })

    test('应该处理 generateText 返回空文本', async () => {
      mockGenerateText.mockResolvedValue({ text: '' })

      const result = await agent.complete([], mockContext)

      expect(result.content).toBe('')
    })

    test('应该处理 toolCalls 为 undefined', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'no tools used',
        toolCalls: undefined,
      })

      const context: AgentContext = {
        ...mockContext,
        executeTools: mockExecuteTools,
      }

      const result = await agent.run([], context)

      expect(result.content).toBe('no tools used')
      // 当 toolCalls 为 undefined 时，run 函数返回的 toolCalls 也是 undefined
      expect(result.toolCalls).toBeUndefined()
    })
  })
})
