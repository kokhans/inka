import { build } from '../build.js'
import type { BuildMode, BuildOptions } from '../types.js'
import { startWatcher } from '../watch.js'

export type NextConfig = Record<string, unknown>

export type NextConfigContext<C extends object> = {
  defaultConfig?: C
}

export type NextConfigFactory<C extends object> = (
  phase: string,
  context: NextConfigContext<C>,
) => C | Promise<C>

// Values of the PHASE_* constants exported by `next/constants`.
const PHASE_DEVELOPMENT_SERVER = 'phase-development-server'
const PHASE_PRODUCTION_BUILD = 'phase-production-build'
const PHASE_PRODUCTION_SERVER = 'phase-production-server'

let started = false

export function withLoomark<C extends object>(
  nextConfig: C | NextConfigFactory<C>,
  options: BuildOptions = {},
): NextConfigFactory<C> {
  return async (phase: string, context: NextConfigContext<C>): Promise<C> => {
    await setup(phase, options)

    if (typeof nextConfig === 'function') {
      return nextConfig(phase, context)
    }

    return nextConfig
  }
}

async function setup(phase: string, options: BuildOptions): Promise<void> {
  if (started) return
  started = true

  // `next start` serves the output of `next build`, which already bundled the content.
  if (phase === PHASE_PRODUCTION_SERVER) return

  const mode = options.mode ?? modeOf(phase)
  await build({ ...options, mode })

  if (phase === PHASE_DEVELOPMENT_SERVER) {
    await startWatcher({ ...options, mode })
  }
}

function modeOf(phase: string): BuildMode | undefined {
  if (phase === PHASE_DEVELOPMENT_SERVER) return 'development'
  if (phase === PHASE_PRODUCTION_BUILD) return 'production'
  return undefined
}
