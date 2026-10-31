import { z } from 'zod'
import type { CollectionDefinition, CollectionOptions, InkaConfig } from './types.js'

export { z }

export function collection<S extends z.ZodType>(
  options: CollectionOptions<S>,
): CollectionDefinition<S> {
  return options
}

export function defineConfig<C extends InkaConfig>(config: C): C {
  return config
}
