import { build } from '../build.js'
import type { BuildMode, BuildOptions } from '../types.js'
import { createRebuildQueue } from '../watch.js'

export type ViteWatcher = {
  on(event: 'change' | 'add' | 'unlink', listener: (file: string) => void): void
}

export type ViteDevServer = {
  watcher: ViteWatcher
  ws: {
    send(payload: { type: string }): void
  }
}

export type ViteResolvedConfig = {
  command: 'build' | 'serve'
}

export type LoomarkPlugin = {
  name: string
  enforce: 'pre'
  configResolved(config: ViteResolvedConfig): void
  buildStart(): Promise<void>
  configureServer(server: ViteDevServer): void
}

const MARKDOWN_EXTENSION = '.md'
const CONFIG_FILE = 'loomark.config.ts'

export function loomark(options: BuildOptions = {}): LoomarkPlugin {
  let mode: BuildMode | undefined = options.mode

  return {
    name: 'loomark',
    enforce: 'pre',
    configResolved(config: ViteResolvedConfig): void {
      mode = options.mode ?? (config.command === 'build' ? 'production' : 'development')
    },
    async buildStart(): Promise<void> {
      await build({ ...options, mode })
    },
    configureServer(server: ViteDevServer): void {
      const rebuild = createRebuildQueue(async () => {
        await build({ ...options, mode })
        server.ws.send({ type: 'full-reload' })
      })

      const onFile = (file: string): void => {
        if (isContentFile(file)) void rebuild()
      }

      server.watcher.on('change', onFile)
      server.watcher.on('add', onFile)
      server.watcher.on('unlink', onFile)
    },
  }
}

function isContentFile(file: string): boolean {
  return file.endsWith(MARKDOWN_EXTENSION) || file.endsWith(CONFIG_FILE)
}
