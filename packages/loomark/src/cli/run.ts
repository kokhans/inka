import { parseArgs } from 'node:util'
import { build } from '../build.js'
import type { BuildMode, BuildOptions } from '../types.js'
import { startWatcher, type StopWatching } from '../watch.js'

export const HELP = `Usage: loomark <command> [options]

Commands:
  build              Generate .loomark/ once. Uses production mode unless --mode is set.
  watch              Build, then rebuild when content or the config changes. Uses development mode.

Options:
  --config <file>    Config file relative to the project root. Default: loomark.config.ts
  --cwd <dir>        Project root. Default: the current folder
  --mode <mode>      development (includes drafts) or production
  -h, --help         Show this help
`

const MODES: readonly BuildMode[] = ['development', 'production']

export type CliIo = {
  log(message: string): void
  error(message: string): void
  /** Resolves when the process is asked to stop, for example on Ctrl+C. */
  untilStopped(): Promise<void>
}

/** Runs the CLI and returns the exit code. */
export async function run(argv: readonly string[], io: CliIo): Promise<number> {
  let parsed: ReturnType<typeof parse>
  try {
    parsed = parse(argv)
  } catch (error) {
    io.error(`loomark: ${messageOf(error)}\n\n${HELP}`)
    return 1
  }

  const { command, values } = parsed
  if (values.help || command === undefined) {
    io.log(HELP)
    return command === undefined && !values.help ? 1 : 0
  }

  if (values.mode !== undefined && !MODES.includes(values.mode as BuildMode)) {
    io.error(`loomark: --mode must be development or production, got "${values.mode}"`)
    return 1
  }

  const options: BuildOptions = {
    ...(values.cwd ? { cwd: values.cwd } : {}),
    ...(values.config ? { configFile: values.config } : {}),
  }

  if (command === 'build') {
    return runBuild(
      { ...options, mode: (values.mode as BuildMode | undefined) ?? 'production' },
      io,
    )
  }
  if (command === 'watch') {
    return runWatch(
      { ...options, mode: (values.mode as BuildMode | undefined) ?? 'development' },
      io,
    )
  }

  io.error(`loomark: unknown command "${command}"\n\n${HELP}`)
  return 1
}

function parse(argv: readonly string[]) {
  const { positionals, values } = parseArgs({
    args: [...argv],
    allowPositionals: true,
    options: {
      config: { type: 'string' },
      cwd: { type: 'string' },
      mode: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  })
  if (positionals.length > 1) throw new Error(`unexpected argument "${positionals[1] ?? ''}"`)
  return { command: positionals[0], values }
}

async function runBuild(options: BuildOptions, io: CliIo): Promise<number> {
  const started = performance.now()
  try {
    // Development builds log invalid files themselves; production builds throw with all of them.
    const { entries, errors } = await build(options)
    if (errors.length > 0) {
      io.error(`loomark: ${plural(errors.length, 'invalid content file', 'invalid content files')}`)
      return 1
    }

    const count = Object.values(entries).reduce((total, items) => total + items.length, 0)
    const collections = Object.keys(entries).length
    const time = Math.round(performance.now() - started)
    io.log(
      `loomark: built ${plural(count, 'entry', 'entries')} in ${plural(collections, 'collection', 'collections')} (${String(time)} ms)`,
    )
    return 0
  } catch (error) {
    io.error(messageOf(error))
    return 1
  }
}

async function runWatch(options: BuildOptions, io: CliIo): Promise<number> {
  let stop: StopWatching
  try {
    // A broken first build is reported but does not stop watching, so it can be fixed in place.
    await build(options).catch((error: unknown) => {
      io.error(messageOf(error))
    })
    stop = await startWatcher(options)
  } catch (error) {
    io.error(messageOf(error))
    return 1
  }

  io.log('loomark: watching for changes, press Ctrl+C to stop')
  await io.untilStopped()
  stop()
  return 0
}

function plural(count: number, one: string, many: string): string {
  return `${String(count)} ${count === 1 ? one : many}`
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
