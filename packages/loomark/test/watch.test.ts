import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { build } from '../src/build.js'
import { collection, defineConfig } from '../src/config.js'
import { startWatcher, type StopWatching } from '../src/watch.js'

const created: string[] = []
let stop: StopWatching | undefined

afterEach(() => {
  stop?.()
  stop = undefined
})

afterAll(async () => {
  await Promise.all(created.map((dir) => rm(dir, { recursive: true, force: true })))
})

// Longer than the watcher's 100ms debounce, so a rebuild would have finished by then.
const SETTLE_TIME = 500

function post(title: string): string {
  return `---\ntitle: ${title}\n---\n\nBody.\n`
}

// A config whose schema overrides every title, so a config edit is visible in the output.
function configSource(title: string): string {
  return [
    'const schema = {',
    `  safeParse: (data: object) => ({ success: true, data: { ...data, title: '${title}' } }),`,
    '}',
    'export default {',
    "  collections: { posts: { folder: 'posts', schema, url: () => '/' } },",
    '}',
    '',
  ].join('\n')
}

function testConfig() {
  return defineConfig({
    collections: {
      posts: collection({
        folder: 'posts',
        schema: z.object({ title: z.string() }),
        url: (entry) => `/blog/${entry.slug}`,
      }),
    },
  })
}

async function createProject(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'loomark-watch-'))
  created.push(root)
  await mkdir(path.join(root, 'content', 'posts', 'nested'), { recursive: true })
  await writeFile(path.join(root, 'content', 'posts', 'first.md'), post('First'))
  await build({ cwd: root, config: testConfig() })
  return root
}

async function watch(root: string): Promise<void> {
  stop = await startWatcher({ cwd: root, config: testConfig() })
  // Let events from creating the project drain before the test touches any files.
  await delay(SETTLE_TIME)
}

async function builtTitles(root: string): Promise<string[]> {
  const source = await readFile(path.join(root, '.loomark', 'posts.json'), 'utf8')
  return (JSON.parse(source) as { title: string }[]).map((entry) => entry.title).sort()
}

async function outputTime(root: string): Promise<number> {
  return (await stat(path.join(root, '.loomark', 'posts.json'))).mtimeMs
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

describe('startWatcher', () => {
  it('rebuilds when a Markdown file is edited', async () => {
    const root = await createProject()
    await watch(root)

    await writeFile(path.join(root, 'content', 'posts', 'first.md'), post('Edited'))

    await vi.waitFor(
      async () => {
        expect(await builtTitles(root)).toEqual(['Edited'])
      },
      { timeout: 5000, interval: 50 },
    )
  })

  it('rebuilds when a Markdown file is added in a nested folder', async () => {
    const root = await createProject()
    await watch(root)

    await writeFile(path.join(root, 'content', 'posts', 'nested', 'second.md'), post('Second'))

    await vi.waitFor(
      async () => {
        expect(await builtTitles(root)).toEqual(['First', 'Second'])
      },
      { timeout: 5000, interval: 50 },
    )
  })

  it('ignores files that are not Markdown', async () => {
    const root = await createProject()
    await watch(root)
    const before = await outputTime(root)

    await writeFile(path.join(root, 'content', 'posts', 'notes.txt'), 'notes')
    await writeFile(path.join(root, 'content', 'posts', 'image.png'), 'png')
    await delay(SETTLE_TIME)

    expect(await outputTime(root)).toBe(before)
  })

  it('rebuilds when the config file changes', async () => {
    const root = await createProject()
    await writeFile(path.join(root, 'loomark.config.ts'), configSource('Config'))
    await build({ cwd: root })
    stop = await startWatcher({ cwd: root })
    await delay(SETTLE_TIME)

    await writeFile(path.join(root, 'loomark.config.ts'), configSource('Edited config'))

    await vi.waitFor(
      async () => {
        expect(await builtTitles(root)).toEqual(['Edited config'])
      },
      { timeout: 5000, interval: 50 },
    )
  })

  it('ignores other files next to the config file', async () => {
    const root = await createProject()
    await writeFile(path.join(root, 'loomark.config.ts'), configSource('Config'))
    await build({ cwd: root })
    stop = await startWatcher({ cwd: root })
    await delay(SETTLE_TIME)
    const before = await outputTime(root)

    await writeFile(path.join(root, 'package.json'), '{}')
    await delay(SETTLE_TIME)

    expect(await outputTime(root)).toBe(before)
  })

  it('stops rebuilding once stopped', async () => {
    const root = await createProject()
    await watch(root)
    stop?.()
    stop = undefined

    await writeFile(path.join(root, 'content', 'posts', 'first.md'), post('Edited'))
    await delay(SETTLE_TIME)

    expect(await builtTitles(root)).toEqual(['First'])
  })
})
