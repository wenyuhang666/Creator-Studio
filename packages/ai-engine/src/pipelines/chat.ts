import { createEngine } from '../index'
import type { Pipeline, PipelineRuntime } from '../core/pipeline'
import type { ProviderConfig, ModelParameters, Message, ToolCallRequest, ToolCallResult } from '../types'

export class ChatPipeline implements Pipeline {
  readonly name = 'chat'

  async run(input: Record<string, unknown>, runtime: PipelineRuntime): Promise<Record<string, unknown>> {
    const provider = input.provider as ProviderConfig
    const parameters = input.parameters as ModelParameters
    const systemPrompt = input.systemPrompt as string
    const messages = input.messages as Message[]

    const engine = createEngine()
    engine.providerManager.addProvider(provider)

    const result = await engine.agent.run(messages, {
      providerId: provider.id,
      parameters,
      systemPrompt,
      executeTools: async (calls: ToolCallRequest[]) => {
        runtime.writeOutput({ type: 'tool_call', calls })
        const resultInput = (await runtime.readInput()) as { type: string; results: ToolCallResult[] }
        if (resultInput.type !== 'tool_result') {
          throw new Error('Expected tool_result')
        }
        return resultInput.results
      },
    })

    return { type: 'done', content: result.content, toolCalls: result.toolCalls }
  }
}
