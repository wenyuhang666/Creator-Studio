import type { Pipeline } from './pipeline'

export class PipelineRegistry {
  private pipelines = new Map<string, Pipeline>()

  register(pipeline: Pipeline): void {
    if (this.pipelines.has(pipeline.name)) {
      throw new Error(`Pipeline already registered: ${pipeline.name}`)
    }
    this.pipelines.set(pipeline.name, pipeline)
  }

  get(name: string): Pipeline | undefined {
    return this.pipelines.get(name)
  }

  has(name: string): boolean {
    return this.pipelines.has(name)
  }

  names(): string[] {
    return [...this.pipelines.keys()]
  }
}
