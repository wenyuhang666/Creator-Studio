#!/usr/bin/env node

import { PipelineRegistry } from './core/registry'
import { ChatPipeline } from './pipelines/chat'
import { CompletePipeline } from './pipelines/complete'
import { CompactPipeline } from './pipelines/compact'
import { FetchModelsPipeline } from './pipelines/fetch-models'
import { ExtractPipeline } from './pipelines/extract'
import { TransformPipeline } from './pipelines/transform'
import type { PipelineRuntime } from './core/pipeline'

// --- JSONL I/O ---

let stdinBuffer = ''
let stdinEnded = false
let wakeReader: (() => void) | null = null

process.stdin.setEncoding('utf8')
process.stdin.on('data', (chunk: string) => {
  stdinBuffer += chunk
  if (wakeReader) {
    const resolve = wakeReader
    wakeReader = null
    resolve()
  }
})
process.stdin.on('end', () => {
  stdinEnded = true
  if (wakeReader) {
    const resolve = wakeReader
    wakeReader = null
    resolve()
  }
})

async function readJsonFromStdin(): Promise<unknown> {
  while (true) {
    const newlineIndex = stdinBuffer.indexOf('\n')
    if (newlineIndex !== -1) {
      const line = stdinBuffer.slice(0, newlineIndex).trim()
      stdinBuffer = stdinBuffer.slice(newlineIndex + 1)
      if (!line) continue
      return JSON.parse(line)
    }
    if (stdinEnded) {
      throw new Error('EOF before complete JSON')
    }
    await new Promise<void>((resolve) => {
      wakeReader = resolve
    })
  }
}

function writeJson(output: Record<string, unknown>) {
  process.stdout.write(JSON.stringify(output) + '\n')
}

// --- Pipeline Registry ---

const registry = new PipelineRegistry()
registry.register(new ChatPipeline())
registry.register(new CompletePipeline())
registry.register(new CompactPipeline())
registry.register(new FetchModelsPipeline())
registry.register(new ExtractPipeline())
registry.register(new TransformPipeline())

// --- Main ---

/**
 * 格式化错误对象为友好的错误消息
 */
function formatError(error: unknown, context?: string): string {
  if (error instanceof Error) {
    // 如果已经有上下文前缀，直接返回
    if (context && error.message.startsWith(`[${context}]`)) {
      return error.message
    }
    // 添加上下文
    if (context) {
      return `[${context}] ${error.message}`
    }
    return error.message
  }
  return String(error)
}

async function main() {
  let input: Record<string, unknown>
  
  // P2 修复：更好的 JSON 解析错误处理
  try {
    input = (await readJsonFromStdin()) as Record<string, unknown>
  } catch (error) {
    if (error instanceof SyntaxError) {
      writeJson({ type: 'error', message: 'Invalid JSON input: please check your request format' })
    } else if (error instanceof Error && error.message === 'EOF before complete JSON') {
      writeJson({ type: 'error', message: 'No input received: please send a valid JSON request' })
    } else {
      writeJson({ type: 'error', message: formatError(error, 'input parsing') })
    }
    process.exit(1)
  }

  const type = input.type as string | undefined
  if (!type) {
    writeJson({ type: 'error', message: 'Missing required field: "type" is required to specify the operation (e.g., chat, transform, extract)' })
    process.exit(1)
  }

  const pipeline = registry.get(type)
  if (!pipeline) {
    const available = registry.names().join(', ')
    writeJson({ 
      type: 'error', 
      message: `Unknown pipeline type "${type}". Available types: ${available}. If you're trying to use a feature like polishing or text transformation, please use "transform".` 
    })
    process.exit(1)
  }

  const runtime: PipelineRuntime = {
    readInput: readJsonFromStdin,
    writeOutput: writeJson,
  }

  try {
    const result = await pipeline.run(input, runtime)
    writeJson(result)
  } catch (error) {
    // P2 修复：提供更友好的错误消息
    const errorMessage = formatError(error, pipeline.name)
    writeJson({ type: 'error', message: errorMessage })
    process.exit(1)
  }
}

main()
