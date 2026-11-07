import { z } from 'zod'
import type { CollectionDefinition, CollectionOptions, LoomarkConfig } from './types.js'

export { z }

export function collection<S extends z.ZodType>(
  options: CollectionOptions<S>,
): CollectionDefinition<S> {
  return options
}

export function defineConfig<C extends LoomarkConfig>(config: C): C {
  return config
}
