import { createEngine } from '../index'
import type { Pipeline, PipelineRuntime } from '../core/pipeline'
import type { ProviderConfig, ModelParameters, Message } from '../types'

export class CompletePipeline implements Pipeline {
  readonly name = 'complete'

  async run(input: Record<string, unknown>, _runtime: PipelineRuntime): Promise<Record<string, unknown>> {
    const provider = input.provider as ProviderConfig
    const parameters = input.parameters as ModelParameters
    const systemPrompt = input.systemPrompt as string
    const messages = input.messages as Message[]

    const engine = createEngine()
    engine.providerManager.addProvider(provider)

    const result = await engine.agent.complete(messages, {
      providerId: provider.id,
      parameters,
      systemPrompt,
    })

    return { type: 'done', content: result.content }
  }
}
