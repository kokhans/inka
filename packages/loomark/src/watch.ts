import { watch, type FSWatcher } from 'node:fs'
import path from 'node:path'
import { build, resolveProject } from './build.js'
import type { BuildOptions } from './types.js'

export type StopWatching = () => void

const REBUILD_DELAY = 100
const MARKDOWN_EXTENSION = '.md'

/**
 * Runs `task` at most once at a time. A request that arrives while the task is running is not
 * dropped: the task runs once more afterwards. Errors are logged so the dev server keeps running.
 */
export function createRebuildQueue(task: () => Promise<void>): () => Promise<void> {
  let running: Promise<void> | undefined
  let pending = false

  const drain = async (): Promise<void> => {
    do {
      pending = false
      try {
        await task()
      } catch (error) {
        console.error(`loomark: rebuild failed\n${formatFailure(error)}`)
      }
    } while (pending)
    running = undefined
  }

  return () => {
    if (running) {
      pending = true
      return running
    }
    running = drain()
    return running
  }
}

export async function startWatcher(options: BuildOptions = {}): Promise<StopWatching> {
  const project = await resolveProject(options)
  let timer: ReturnType<typeof setTimeout> | undefined

  const rebuild = createRebuildQueue(async () => {
    await build(options)
  })

  const schedule = (): void => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => void rebuild(), REBUILD_DELAY)
  }

  const watchers: FSWatcher[] = [
    watch(project.contentDir, { recursive: true }, (_event, file) => {
      if (file?.endsWith(MARKDOWN_EXTENSION)) schedule()
    }),
  ]

  // An inline config is not reloaded, so only a config file is worth watching. Its folder is
  // watched rather than the file, because editors often save by replacing the file.
  if (!options.config && project.configFile) {
    const configName = path.basename(project.configFile)
    watchers.push(
      watch(path.dirname(project.configFile), (_event, file) => {
        if (file === configName) schedule()
      }),
    )
  }

  return () => {
    for (const watcher of watchers) watcher.close()
    if (timer) clearTimeout(timer)
  }
}

function formatFailure(error: unknown): string {
  if (error instanceof Error) return error.stack ?? error.message
  return String(error)
}
