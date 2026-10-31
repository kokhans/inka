import { build } from '../build.js'
import type { BuildOptions } from '../types.js'

export type ViteWatcher = {
  on(event: 'change' | 'add' | 'unlink', listener: (file: string) => void): void
}

export type ViteDevServer = {
  watcher: ViteWatcher
  ws: {
    send(payload: { type: string }): void
  }
}

export type InkaPlugin = {
  name: string
  enforce: 'pre'
  buildStart(): Promise<void>
  configureServer(server: ViteDevServer): void
}

const MARKDOWN_EXTENSION = '.md'
const CONFIG_FILE = 'inka.config.ts'

export function inka(options: BuildOptions = {}): InkaPlugin {
  return {
    name: 'inka',
    enforce: 'pre',
    async buildStart(): Promise<void> {
      await build(options)
    },
    configureServer(server: ViteDevServer): void {
      const rebuild = async (file: string): Promise<void> => {
        if (!isContentFile(file)) return
        await build(options)
        server.ws.send({ type: 'full-reload' })
      }

      server.watcher.on('change', (file) => void rebuild(file))
      server.watcher.on('add', (file) => void rebuild(file))
      server.watcher.on('unlink', (file) => void rebuild(file))
    },
  }
}

function isContentFile(file: string): boolean {
  return file.endsWith(MARKDOWN_EXTENSION) || file.endsWith(CONFIG_FILE)
}
