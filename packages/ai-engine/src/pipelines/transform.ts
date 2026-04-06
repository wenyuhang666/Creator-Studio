import type { Pipeline, PipelineRuntime } from '../core/pipeline'
import type { ProviderConfig, ModelParameters } from '../types'
import { ProviderManager, validateProviderConfig } from '../provider'
import { generateText } from 'ai'

type TransformAction = 'polish' | 'expand' | 'condense' | 'restyle'

const SYSTEM_PROMPTS: Record<TransformAction, string> = {
  polish: `你是一位专业的小说编辑。对用户提供的文本进行润色，改善文笔和表达，保持原意不变。
要求：
- 只输出润色后的文本，不要输出解释或说明
- 保持原文的人称、时态、语气
- 修正病句、提升文采、改善节奏感
- 不要大幅改变情节或增删内容`,

  expand: `你是一位专业的小说作家。对用户提供的文本进行扩写，丰富细节和描写。
要求：
- 只输出扩写后的文本，不要输出解释或说明
- 保持原文的人称、时态、语气和情节走向
- 增加环境描写、心理活动、对话细节
- 扩写幅度约为原文的 1.5-2 倍`,

  condense: `你是一位专业的小说编辑。对用户提供的文本进行缩写，精炼表达。
要求：
- 只输出缩写后的文本，不要输出解释或说明
- 保留关键情节和信息
- 删减冗余描写、重复内容
- 缩写幅度约为原文的 50-70%`,

  restyle: `你是一位专业的小说作家。将用户提供的文本改写为指定风格。
要求：
- 只输出改写后的文本，不要输出解释或说明
- 保持原文的情节和人物不变
- 按照用户指定的风格进行改写`,
}

export class TransformPipeline implements Pipeline {
  readonly name = 'transform'

  async run(input: Record<string, unknown>, _runtime: PipelineRuntime): Promise<Record<string, unknown>> {
    // P0 修复：验证必需输入字段
    const provider = input.provider as ProviderConfig | undefined
    const parameters = input.parameters as ModelParameters | undefined
    const text = input.text as string | undefined
    const action = (input.action as TransformAction) ?? 'polish'
    const style = input.style as string | undefined

    // 验证 provider 配置
    if (!provider) {
      throw new Error('Missing required field: provider configuration is required')
    }
    try {
      validateProviderConfig(provider, 'transform pipeline')
    } catch (err) {
      throw new Error(`Invalid provider configuration in transform request: ${err instanceof Error ? err.message : String(err)}`)
    }

    // 验证 parameters 配置
    if (!parameters || typeof parameters !== 'object') {
      throw new Error('Missing required field: parameters configuration is required')
    }
    if (!parameters.model || typeof parameters.model !== 'string') {
      throw new Error('Missing required field: parameters.model must be a non-empty string')
    }

    // 验证 text 输入
    if (!text || typeof text !== 'string') {
      throw new Error('Missing required field: text must be a non-empty string')
    }

    // 验证 action
    const validActions: TransformAction[] = ['polish', 'expand', 'condense', 'restyle']
    if (!validActions.includes(action)) {
      throw new Error(`Invalid action '${action}'. Expected one of: ${validActions.join(', ')}`)
    }

    const providerManager = new ProviderManager()
    providerManager.addProvider(provider)
    const sdk = providerManager.createSDK(provider.id)
    const model = sdk(parameters.model)

    let systemPrompt = SYSTEM_PROMPTS[action] ?? SYSTEM_PROMPTS.polish
    if (action === 'restyle' && style) {
      systemPrompt += `\n\n目标风格：${style}`
    }

    const result = await generateText({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ] as any,
      maxSteps: 1,
      temperature: action === 'polish' ? 0.3 : 0.7,
      maxTokens: parameters.maxTokens ?? 4000,
    } as any)

    return { type: 'transform_result', content: (result as any).text ?? '' }
  }
}
