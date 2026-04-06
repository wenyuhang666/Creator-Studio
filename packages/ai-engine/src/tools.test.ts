import { describe, expect, test, beforeEach, vi } from 'bun:test'
import { tools, getToolsForSDK } from './tools'
import type { ToolCallRequest, ToolCallResult } from './types'

describe('Tools', () => {
  // ========== 工具定义完整性测试 ==========

  describe('工具定义完整性', () => {
    test('应该导出 8 个工具', () => {
      expect(tools.length).toBe(8)
    })

    test('应该包含 read 工具', () => {
      const readTool = tools.find((t) => t.name === 'read')
      expect(readTool).toBeDefined()
      expect(readTool!.description).toContain('读取文件内容')
      expect(readTool!.parameters.required).toContain('path')
      expect(readTool!.parameters.properties.path.type).toBe('string')
    })

    test('应该包含 write 工具', () => {
      const writeTool = tools.find((t) => t.name === 'write')
      expect(writeTool).toBeDefined()
      expect(writeTool!.description).toContain('写入文件内容')
      expect(writeTool!.parameters.required).toContain('path')
      expect(writeTool!.parameters.required).toContain('content')
    })

    test('应该包含 append 工具', () => {
      const appendTool = tools.find((t) => t.name === 'append')
      expect(appendTool).toBeDefined()
      expect(appendTool!.description).toContain('追加内容')
    })

    test('应该包含 list 工具', () => {
      const listTool = tools.find((t) => t.name === 'list')
      expect(listTool).toBeDefined()
      expect(listTool!.parameters.required).toEqual([])
    })

    test('应该包含 search 工具', () => {
      const searchTool = tools.find((t) => t.name === 'search')
      expect(searchTool).toBeDefined()
      expect(searchTool!.parameters.required).toContain('query')
    })

    test('应该包含 get_chapter_info 工具', () => {
      const chapterTool = tools.find((t) => t.name === 'get_chapter_info')
      expect(chapterTool).toBeDefined()
      expect(chapterTool!.parameters.required).toEqual([])
    })

    test('应该包含 save_summary 工具', () => {
      const summaryTool = tools.find((t) => t.name === 'save_summary')
      expect(summaryTool).toBeDefined()
      expect(summaryTool!.parameters.required).toContain('chapterId')
      expect(summaryTool!.parameters.required).toContain('summary')
    })

    test('应该包含 rag_search 工具', () => {
      const ragTool = tools.find((t) => t.name === 'rag_search')
      expect(ragTool).toBeDefined()
      expect(ragTool!.description).toContain('知识库')
      expect(ragTool!.parameters.required).toContain('query')
    })

    test('所有工具应该有正确的参数结构', () => {
      for (const tool of tools) {
        expect(tool.name).toBeTruthy()
        expect(tool.description).toBeTruthy()
        expect(tool.parameters).toBeDefined()
        expect(tool.parameters.type).toBe('object')
        expect(tool.parameters.properties).toBeDefined()
        expect(Array.isArray(tool.parameters.required)).toBe(true)
      }
    })
  })

  // ========== getToolsForSDK 函数测试 ==========

  describe('getToolsForSDK 函数', () => {
    test('应该返回包含所有工具的对象', () => {
      const sdkTools = getToolsForSDK()
      expect(sdkTools).toHaveProperty('read')
      expect(sdkTools).toHaveProperty('write')
      expect(sdkTools).toHaveProperty('append')
      expect(sdkTools).toHaveProperty('list')
      expect(sdkTools).toHaveProperty('search')
      expect(sdkTools).toHaveProperty('get_chapter_info')
      expect(sdkTools).toHaveProperty('save_summary')
      expect(sdkTools).toHaveProperty('rag_search')
    })

    test('没有 executeTools 时 execute 应该为 undefined', () => {
      const sdkTools = getToolsForSDK()
      expect((sdkTools as any).read.execute).toBeUndefined()
      expect((sdkTools as any).write.execute).toBeUndefined()
    })

    test('有 executeTools 时 execute 应该被设置', () => {
      const mockExecuteTools = async (): Promise<ToolCallResult[]> => []
      const sdkTools = getToolsForSDK(mockExecuteTools)
      expect((sdkTools as any).read.execute).toBeDefined()
      expect(typeof (sdkTools as any).read.execute).toBe('function')
    })

    test('应该正确传递工具描述', () => {
      const sdkTools = getToolsForSDK()
      expect((sdkTools as any).read.description).toContain('读取文件内容')
      expect((sdkTools as any).write.description).toContain('写入文件内容')
    })

    test('应该正确传递 JSON Schema 参数', () => {
      const sdkTools = getToolsForSDK()
      const readTool = (sdkTools as any).read
      expect(readTool.parameters).toBeDefined()
      // jsonSchema 返回的对象有 jsonSchema 属性
      expect(readTool.parameters).toHaveProperty('jsonSchema')
    })
  })

  // ========== executeTools 回调测试 ==========

  describe('executeTools 回调', () => {
    test('应该调用 executeTools 并传递正确的参数', async () => {
      const mockExecuteTools = vi.fn().mockResolvedValue([
        { id: 'call-1', result: 'file content' },
      ])

      const sdkTools = getToolsForSDK(mockExecuteTools)
      const executeFn = (sdkTools as any).read.execute

      const result = await executeFn({ path: 'chapter1.txt' }, { toolCallId: 'call-1' })

      expect(mockExecuteTools).toHaveBeenCalledTimes(1)
      expect(mockExecuteTools).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'call-1',
          name: 'read',
          args: { path: 'chapter1.txt' },
        }),
      ])
      expect(result).toBe('file content')
    })

    test('应该处理 executeTools 返回的 error', async () => {
      const mockExecuteTools = vi.fn().mockResolvedValue([
        { id: 'call-1', result: '', error: 'File not found' },
      ])

      const sdkTools = getToolsForSDK(mockExecuteTools)
      const executeFn = (sdkTools as any).read.execute

      const result = await executeFn({ path: 'nonexistent.txt' }, { toolCallId: 'call-1' })

      // 错误应该被格式化为 JSON 字符串
      expect(result).toBe(JSON.stringify({ error: 'File not found' }))
    })

    test('没有 toolCallId 时应该生成 fallback id', async () => {
      const mockExecuteTools = vi.fn().mockResolvedValue([
        { id: 'some-id', result: 'result' },
      ])

      const sdkTools = getToolsForSDK(mockExecuteTools)
      const executeFn = (sdkTools as any).read.execute

      await executeFn({ path: 'test.txt' })

      expect(mockExecuteTools).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'read',
            args: { path: 'test.txt' },
          }),
        ]),
      )

      // 验证生成了 id
      const call = mockExecuteTools.mock.calls[0][0][0]
      expect(call.id).toMatch(/^read-[\d]+-[a-f0-9]+$/)
    })

    test('没有 executeTools 时 execute 函数未定义', () => {
      const sdkTools = getToolsForSDK()
      // 当没有 executeTools 时，execute 是 undefined
      expect((sdkTools as any).read.execute).toBeUndefined()
    })

    test('应该正确处理 write 工具调用', async () => {
      const mockExecuteTools = vi.fn().mockResolvedValue([
        { id: 'call-1', result: 'File written successfully' },
      ])

      const sdkTools = getToolsForSDK(mockExecuteTools)
      const executeFn = (sdkTools as any).write.execute

      await executeFn({ path: 'output.txt', content: 'Hello World' }, { toolCallId: 'call-1' })

      expect(mockExecuteTools).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'write',
          args: { path: 'output.txt', content: 'Hello World' },
        }),
      ])
    })

    test('应该正确处理 search 工具调用', async () => {
      const mockExecuteTools = vi.fn().mockResolvedValue([
        { id: 'call-1', result: 'Found 3 matches' },
      ])

      const sdkTools = getToolsForSDK(mockExecuteTools)
      const executeFn = (sdkTools as any).search.execute

      await executeFn({ query: '关键词', path: 'src/' }, { toolCallId: 'call-1' })

      expect(mockExecuteTools).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'search',
          args: { query: '关键词', path: 'src/' },
        }),
      ])
    })

    test('应该正确处理 get_chapter_info 工具调用', async () => {
      const mockExecuteTools = vi.fn().mockResolvedValue([
        { id: 'call-1', result: '{"path":"chapter_003.md","words":5000}' },
      ])

      const sdkTools = getToolsForSDK(mockExecuteTools)
      const executeFn = (sdkTools as any).get_chapter_info.execute

      await executeFn({}, { toolCallId: 'call-1' })

      expect(mockExecuteTools).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'get_chapter_info',
          args: {},
        }),
      ])
    })

    test('应该正确处理 save_summary 工具调用', async () => {
      const mockExecuteTools = vi.fn().mockResolvedValue([
        { id: 'call-1', result: 'Summary saved' },
      ])

      const sdkTools = getToolsForSDK(mockExecuteTools)
      const executeFn = (sdkTools as any).save_summary.execute

      await executeFn(
        { chapterId: 'chapter_003', summary: '主角在森林中发现了神秘遗迹' },
        { toolCallId: 'call-1' },
      )

      expect(mockExecuteTools).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'save_summary',
          args: { chapterId: 'chapter_003', summary: '主角在森林中发现了神秘遗迹' },
        }),
      ])
    })

    test('应该正确处理 rag_search 工具调用', async () => {
      const mockExecuteTools = vi.fn().mockResolvedValue([
        { id: 'call-1', result: '相关片段：...' },
      ])

      const sdkTools = getToolsForSDK(mockExecuteTools)
      const executeFn = (sdkTools as any).rag_search.execute

      await executeFn({ query: '人物设定', topK: 3 }, { toolCallId: 'call-1' })

      expect(mockExecuteTools).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'rag_search',
          args: { query: '人物设定', topK: 3 },
        }),
      ])
    })
  })

  // ========== 工具结果格式化测试 ==========

  describe('工具结果格式化', () => {
    test('应该返回字符串结果', async () => {
      const mockExecuteTools = vi.fn().mockResolvedValue([
        { id: 'call-1', result: 'Plain text result' },
      ])

      const sdkTools = getToolsForSDK(mockExecuteTools)
      const executeFn = (sdkTools as any).read.execute

      const result = await executeFn({ path: 'test.txt' }, { toolCallId: 'call-1' })
      expect(typeof result).toBe('string')
      expect(result).toBe('Plain text result')
    })

    test('应该处理 JSON 字符串结果', async () => {
      const jsonResult = JSON.stringify({ success: true, lines: 100 })
      const mockExecuteTools = vi.fn().mockResolvedValue([
        { id: 'call-1', result: jsonResult },
      ])

      const sdkTools = getToolsForSDK(mockExecuteTools)
      const executeFn = (sdkTools as any).read.execute

      const result = await executeFn({ path: 'test.txt' }, { toolCallId: 'call-1' })
      expect(result).toBe(jsonResult)
    })

    test('应该处理空结果', async () => {
      const mockExecuteTools = vi.fn().mockResolvedValue([
        { id: 'call-1', result: '' },
      ])

      const sdkTools = getToolsForSDK(mockExecuteTools)
      const executeFn = (sdkTools as any).read.execute

      const result = await executeFn({ path: 'test.txt' }, { toolCallId: 'call-1' })
      expect(result).toBe('')
    })

    test('应该处理 null 结果', async () => {
      const mockExecuteTools = vi.fn().mockResolvedValue([
        { id: 'call-1', result: null as any },
      ])

      const sdkTools = getToolsForSDK(mockExecuteTools)
      const executeFn = (sdkTools as any).read.execute

      const result = await executeFn({ path: 'test.txt' }, { toolCallId: 'call-1' })
      expect(result).toBe('')
    })
  })

  // ========== 边界情况测试 ==========

  describe('边界情况', () => {
    test('应该处理 executeTools 返回多个结果但没有匹配的 id', async () => {
      const mockExecuteTools = vi.fn().mockResolvedValue([
        { id: 'other-call', result: 'different result' },
      ])

      const sdkTools = getToolsForSDK(mockExecuteTools)
      const executeFn = (sdkTools as any).read.execute

      // 没有匹配的 id，应该使用第一个结果
      const result = await executeFn({ path: 'test.txt' }, { toolCallId: 'call-1' })
      expect(result).toBe('different result')
    })

    test('应该处理 executeTools 返回空数组', async () => {
      const mockExecuteTools = vi.fn().mockResolvedValue([])

      const sdkTools = getToolsForSDK(mockExecuteTools)
      const executeFn = (sdkTools as any).read.execute

      await expect(executeFn({ path: 'test.txt' }, { toolCallId: 'call-1' })).rejects.toThrow(
        'No result returned for tool: read',
      )
    })
  })
})
