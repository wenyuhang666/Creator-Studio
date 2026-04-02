import { fetchModels } from '../models'
import type { Pipeline, PipelineRuntime } from '../core/pipeline'

export class FetchModelsPipeline implements Pipeline {
  readonly name = 'fetch_models'

  async run(input: Record<string, unknown>, _runtime: PipelineRuntime): Promise<Record<string, unknown>> {
    const baseURL = input.baseURL as string
    const apiKey = input.apiKey as string
    const providerType = (input.providerType as string) ?? 'openai-compatible'

    const models = await fetchModels(baseURL, apiKey, providerType)
    return { type: 'models', models }
  }
}
