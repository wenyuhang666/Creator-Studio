#!/usr/bin/env node

import { createEngine } from './index'
import { generateCompactSummary } from './compact'
import { fetchModels } from './models'
import type { Message, ModelParameters, ProviderConfig, ToolCallRequest, ToolCallResult } from './types'

type ChatInput = {
  type: 'chat'
  provider: ProviderConfig
  parameters: ModelParameters
  systemPrompt: string
  messages: Message[]
}

type CompleteInput = {
  type: 'complete'
  provider: ProviderConfig
  parameters: ModelParameters
  systemPrompt: string
  messages: Message[]
}

type FetchModelsInput = {
  type: 'fetch_models'
  baseURL: string
  apiKey: string
  providerType?: ProviderConfig['providerType']
}

type CompactInput = {
  type: 'compact'
  provider: ProviderConfig
  parameters: ModelParameters
  messages: Message[]
}

type ToolResultInput = {
  type: 'tool_result'
  results: ToolCallResult[]
}

type EngineOutput =
  | { type: 'tool_call'; calls: ToolCallRequest[] }
  | { type: 'done'; content: string }
  | { type: 'compact_summary'; content: string }
  | { type: 'models'; models: string[] }
  | { type: 'error'; message: string }

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

function writeJson(output: EngineOutput) {
  process.stdout.write(JSON.stringify(output) + '\n')
}

async function main() {
  const engine = createEngine()

  const input = (await readJsonFromStdin()) as
    | ChatInput
    | CompleteInput
    | FetchModelsInput
    | CompactInput

  if (input.type === 'fetch_models') {
    try {
      const models = await fetchModels(input.baseURL, input.apiKey, input.providerType ?? 'openai-compatible')
      writeJson({ type: 'models', models })
    } catch (error) {
      writeJson({ type: 'error', message: error instanceof Error ? error.message : String(error) })
    }
    process.exit(0)
  }

  if (input.type === 'compact') {
    try {
      const content = await generateCompactSummary({
        provider: input.provider,
        parameters: input.parameters,
        messages: input.messages,
      })
      writeJson({ type: 'compact_summary', content })
      process.exit(0)
    } catch (error) {
      writeJson({ type: 'error', message: error instanceof Error ? error.message : String(error) })
      process.exit(1)
    }
  }

  if (input.type === 'complete') {
    engine.providerManager.addProvider(input.provider)

    try {
      const result = await engine.agent.complete(input.messages, {
        providerId: input.provider.id,
        parameters: input.parameters,
        systemPrompt: input.systemPrompt,
      })
      writeJson({ type: 'done', content: result.content })
      process.exit(0)
    } catch (error) {
      writeJson({ type: 'error', message: error instanceof Error ? error.message : String(error) })
      process.exit(1)
    }
  }

  if (input.type !== 'chat') {
    writeJson({ type: 'error', message: 'Unknown request type' })
    process.exit(1)
  }

  engine.providerManager.addProvider(input.provider)

  try {
    const result = await engine.agent.run(input.messages, {
      providerId: input.provider.id,
      parameters: input.parameters,
      systemPrompt: input.systemPrompt,
      executeTools: async (calls: ToolCallRequest[]) => {
        writeJson({ type: 'tool_call', calls })

        const resultInput = (await readJsonFromStdin()) as ToolResultInput
        if (resultInput.type !== 'tool_result') {
          throw new Error('Expected tool_result')
        }
        return resultInput.results
      },
    })

    writeJson({ type: 'done', content: result.content })
  } catch (error) {
    writeJson({ type: 'error', message: error instanceof Error ? error.message : String(error) })
    process.exit(1)
  }
}

main()
