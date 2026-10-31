import { build } from '../build.js'
import { isProduction } from '../shared/environment.js'
import type { BuildOptions } from '../types.js'
import { startWatcher } from '../watch.js'

export type NextConfig = Record<string, unknown>

export type NextConfigContext<C extends object> = {
  defaultConfig?: C
}

export type NextConfigFactory<C extends object> = (
  phase: string,
  context: NextConfigContext<C>,
) => C | Promise<C>

let started = false

export function withInka<C extends object>(
  nextConfig: C | NextConfigFactory<C>,
  options: BuildOptions = {},
): NextConfigFactory<C> {
  return async (phase: string, context: NextConfigContext<C>): Promise<C> => {
    await setup(options)

    if (typeof nextConfig === 'function') {
      return nextConfig(phase, context)
    }

    return nextConfig
  }
}

async function setup(options: BuildOptions): Promise<void> {
  if (started) return
  started = true

  await build(options)

  if (!isProduction()) {
    await startWatcher(options)
  }
}
