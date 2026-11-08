import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { build } from '../src/build.js'
import { collection, defineConfig } from '../src/config.js'

const created: string[] = []

afterAll(async () => {
  await Promise.all(created.map((dir) => rm(dir, { recursive: true, force: true })))
})

const POST = `---
title: First post
date: 2026-01-15
updated: 2026-02-01
tags: [react]
---

Post body.
`

const PAGE = `---
title: About
---

About body.
`

const AUTHOR = `---
name: Ada
---

Author body.
`

const CONFIG_FILE = [
  'const schema = { safeParse: (data: unknown) => ({ success: true, data }) }',
  'export default {',
  '  collections: {',
  "    posts: { folder: 'posts', schema, url: () => '/' },",
  "    pages: { folder: 'pages', schema, url: () => '/' },",
  '  },',
  '}',
  '',
].join('\n')

async function createProject(files: Record<string, string> = {}): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'loomark-codegen-'))
  created.push(root)

  const defaults: Record<string, string> = {
    'content/posts/first.md': POST,
    'content/pages/about.md': PAGE,
    'content/authors/ada.md': AUTHOR,
  }

  for (const [name, content] of Object.entries({ ...defaults, ...files })) {
    const filePath = path.join(root, name)
    await mkdir(path.dirname(filePath), { recursive: true })
    await writeFile(filePath, content)
  }

  return root
}

async function readOutput(root: string, name: string): Promise<string> {
  return readFile(path.join(root, '.loomark', name), 'utf8')
}

function inlineConfig() {
  return defineConfig({
    collections: {
      posts: collection({
        folder: 'posts',
        schema: z.object({
          title: z.string(),
          date: z.coerce.date(),
          updated: z.coerce.date(),
          tags: z.array(z.string()),
        }),
        url: (entry) => `/blog/${entry.slug}`,
        sort: { date: 'desc' },
        search: { fields: ['title', 'body'], boost: { title: 2 } },
        perPage: 5,
      }),
      pages: collection({
        folder: 'pages',
        schema: z.object({ title: z.string() }),
        url: (entry) => `/${entry.slug}`,
      }),
      authors: collection({
        folder: 'authors',
        schema: z.object({ name: z.string() }),
        url: (entry) => `/authors/${entry.slug}`,
        sort: { name: 'asc' },
      }),
    },
  })
}

describe('generated code', () => {
  it('renders index.js for several collections', async () => {
    const root = await createProject()
    await build({ cwd: root, config: inlineConfig() })

    expect(await readOutput(root, 'index.js')).toMatchInlineSnapshot(`
      "import { createCollection as __loomarkCreateCollection } from 'loomark/query'
      import __loomark_posts from './posts.json' with { type: 'json' }
      import __loomark_pages from './pages.json' with { type: 'json' }
      import __loomark_authors from './authors.json' with { type: 'json' }

      export const posts = __loomarkCreateCollection(__loomark_posts, {
        name: "posts",
        sort: {"date":"desc"},
        search: {"fields":["title","body"],"boost":{"title":2}},
        perPage: 5,
        dates: ["date","updated"],
      })

      export const pages = __loomarkCreateCollection(__loomark_pages, {
        name: "pages",
      })

      export const authors = __loomarkCreateCollection(__loomark_authors, {
        name: "authors",
        sort: {"name":"asc"},
      })

      "
    `)
  })

  it('renders index.d.ts with plain entries when the config is passed inline', async () => {
    const root = await createProject()
    await build({ cwd: root, config: inlineConfig() })

    expect(await readOutput(root, 'index.d.ts')).toMatchInlineSnapshot(`
      "import type { Collection } from 'loomark/query'
      import type { Entry } from 'loomark/query'

      export declare const posts: Collection<Entry>
      export declare const pages: Collection<Entry>
      export declare const authors: Collection<Entry>
      "
    `)
  })

  it('renders index.d.ts typed from the config file', async () => {
    const root = await createProject({ 'loomark.config.ts': CONFIG_FILE })
    await build({ cwd: root })

    expect(await readOutput(root, 'index.d.ts')).toMatchInlineSnapshot(`
      "import type { Collection } from 'loomark/query'
      import type { EntryOf } from 'loomark'
      import type config from '../loomark.config'

      export declare const posts: Collection<EntryOf<typeof config.collections.posts>>
      export declare const pages: Collection<EntryOf<typeof config.collections.pages>>
      "
    `)
  })

  it('imports a config file from a subfolder with a relative path', async () => {
    const root = await createProject({ 'config/loomark.config.ts': CONFIG_FILE })
    await build({ cwd: root, configFile: 'config/loomark.config.ts' })

    expect(await readOutput(root, 'index.d.ts')).toContain(
      `import type config from '../config/loomark.config'`,
    )
  })
})
