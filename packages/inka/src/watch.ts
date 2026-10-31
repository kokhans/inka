import { watch, type FSWatcher } from 'node:fs'
import { build, resolveProject } from './build.js'
import type { BuildOptions } from './types.js'

export type StopWatching = () => void

const REBUILD_DELAY = 100
const MARKDOWN_EXTENSION = '.md'

export async function startWatcher(options: BuildOptions = {}): Promise<StopWatching> {
  const project = await resolveProject(options)
  let timer: ReturnType<typeof setTimeout> | undefined
  let running = false

  const rebuild = async (): Promise<void> => {
    if (running) return
    running = true
    try {
      await build(options)
    } finally {
      running = false
    }
  }

  const watcher: FSWatcher = watch(project.contentDir, { recursive: true }, (_event, file) => {
    if (!file?.endsWith(MARKDOWN_EXTENSION)) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => void rebuild(), REBUILD_DELAY)
  })

  return () => {
    watcher.close()
    if (timer) clearTimeout(timer)
  }
}
