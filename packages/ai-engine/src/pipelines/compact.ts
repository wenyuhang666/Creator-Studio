import { generateCompactSummary } from '../compact'
import type { Pipeline, PipelineRuntime } from '../core/pipeline'
import type { ProviderConfig, ModelParameters, Message } from '../types'

export class CompactPipeline implements Pipeline {
  readonly name = 'compact'

  async run(input: Record<string, unknown>, _runtime: PipelineRuntime): Promise<Record<string, unknown>> {
    const provider = input.provider as ProviderConfig
    const parameters = input.parameters as ModelParameters
    const messages = input.messages as Message[]

    const content = await generateCompactSummary({ provider, parameters, messages })
    return { type: 'compact_summary', content }
  }
}
