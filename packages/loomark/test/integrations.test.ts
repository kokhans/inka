import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { collection, defineConfig } from '../src/config.js'
import type { LoomarkConfig } from '../src/types.js'
import type { ViteDevServer } from '../src/vite/index.js'
import { loomark } from '../src/vite/index.js'
import { createRebuildQueue } from '../src/watch.js'

const created: string[] = []

afterAll(async () => {
  await Promise.all(created.map((dir) => rm(dir, { recursive: true, force: true })))
})

afterEach(() => {
  vi.restoreAllMocks()
})

const POST = `---
title: Post
---

Body.
`

const DRAFT = `---
title: Draft
draft: true
---

Body.
`

function testConfig(): LoomarkConfig {
  return defineConfig({
    collections: {
      posts: collection({
        folder: 'posts',
        schema: z.object({ title: z.string(), draft: z.boolean().default(false) }),
        url: (entry) => `/blog/${entry.slug}`,
      }),
    },
  })
}

async function createProject(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'loomark-integrations-'))
  created.push(root)
  await mkdir(path.join(root, 'content', 'posts'), { recursive: true })
  await writeFile(path.join(root, 'content', 'posts', 'post.md'), POST)
  await writeFile(path.join(root, 'content', 'posts', 'draft.md'), DRAFT)
  return root
}

async function builtSlugs(root: string): Promise<string[]> {
  const source = await readFile(path.join(root, '.loomark', 'posts.json'), 'utf8')
  return (JSON.parse(source) as { slug: string }[]).map((entry) => entry.slug)
}

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve = (): void => undefined
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe('createRebuildQueue', () => {
  it('runs once more when a rebuild is requested while one is running', async () => {
    const gate = deferred()
    let calls = 0
    const rebuild = createRebuildQueue(async () => {
      calls += 1
      if (calls === 1) await gate.promise
    })

    const first = rebuild()
    void rebuild()
    void rebuild()
    gate.resolve()
    await first

    expect(calls).toBe(2)
  })

  it('logs failures and keeps working', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    let calls = 0
    const rebuild = createRebuildQueue(() => {
      calls += 1
      return calls === 1 ? Promise.reject(new Error('broken config')) : Promise.resolve()
    })

    await expect(rebuild()).resolves.toBeUndefined()
    await rebuild()

    expect(calls).toBe(2)
    expect(log).toHaveBeenCalledWith(expect.stringContaining('broken config'))
  })
})

describe('vite plugin', () => {
  function fakeServer(): { server: ViteDevServer; emit: (file: string) => void; sent: string[] } {
    const listeners: ((file: string) => void)[] = []
    const sent: string[] = []
    return {
      server: {
        watcher: {
          on: (event, listener) => {
            if (event === 'change') listeners.push(listener)
          },
        },
        ws: { send: (payload) => void sent.push(payload.type) },
      },
      emit: (file) => {
        for (const listener of listeners) listener(file)
      },
      sent,
    }
  }

  it('drops drafts in vite build', async () => {
    const root = await createProject()
    const plugin = loomark({ cwd: root, config: testConfig() })

    plugin.configResolved({ command: 'build' })
    await plugin.buildStart()

    expect(await builtSlugs(root)).toEqual(['post'])
  })

  it('keeps drafts in the vite dev server', async () => {
    const root = await createProject()
    const plugin = loomark({ cwd: root, config: testConfig() })

    plugin.configResolved({ command: 'serve' })
    await plugin.buildStart()

    expect(await builtSlugs(root)).toEqual(['draft', 'post'])
  })

  it('rebuilds and reloads on content changes without throwing on failures', async () => {
    const root = await createProject()
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    let config = testConfig()
    const plugin = loomark({
      cwd: root,
      get config() {
        return config
      },
    })
    const { server, emit, sent } = fakeServer()

    plugin.configResolved({ command: 'serve' })
    plugin.configureServer(server)

    emit(path.join(root, 'content', 'posts', 'readme.txt'))
    expect(sent).toEqual([])

    emit(path.join(root, 'content', 'posts', 'post.md'))
    await vi.waitFor(() => {
      expect(sent).toEqual(['full-reload'])
    })

    config = { collections: { 'bad-name': config.collections['posts'] } }
    emit(path.join(root, 'content', 'posts', 'post.md'))
    await vi.waitFor(() => {
      expect(log).toHaveBeenCalledWith(expect.stringContaining('invalid collection name'))
    })
    expect(sent).toEqual(['full-reload'])
  })
})

describe('next plugin', () => {
  async function loadWithLoomark(): Promise<typeof import('../src/next/index.js').withLoomark> {
    vi.resetModules()
    const module = await import('../src/next/index.js')
    return module.withLoomark
  }

  it('builds in production mode for next build', async () => {
    const root = await createProject()
    const withLoomark = await loadWithLoomark()

    const factory = withLoomark({ reactStrictMode: true }, { cwd: root, config: testConfig() })
    const config = await factory('phase-production-build', {})

    expect(config).toEqual({ reactStrictMode: true })
    expect(await builtSlugs(root)).toEqual(['post'])
  })

  it('skips the build for next start', async () => {
    const root = await createProject()
    const withLoomark = await loadWithLoomark()

    await withLoomark({}, { cwd: root, config: testConfig() })('phase-production-server', {})

    await expect(access(path.join(root, '.loomark'))).rejects.toThrow()
  })
})
