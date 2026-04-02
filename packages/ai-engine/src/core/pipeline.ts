import type { ToolCallRequest, ToolCallResult } from '../types'

export type ToolExecutor = (calls: ToolCallRequest[]) => Promise<ToolCallResult[]>

export interface PipelineRuntime {
  readInput: () => Promise<unknown>
  writeOutput: (output: Record<string, unknown>) => void
}

export interface Pipeline {
  readonly name: string
  run(input: Record<string, unknown>, runtime: PipelineRuntime): Promise<Record<string, unknown>>
}
