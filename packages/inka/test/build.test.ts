import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { build } from '../src/build.js'
import { collection, defineConfig } from '../src/config.js'
import type { InkaConfig } from '../src/types.js'

const created: string[] = []

afterAll(async () => {
  await Promise.all(created.map((dir) => rm(dir, { recursive: true, force: true })))
})

const HELLO = `---
title: Hello Inka
description: A first post
date: 2026-01-15
tags: [react, mermaid]
---

## Intro

Some text.

\`\`\`mermaid
flowchart TD
  A --> B
\`\`\`
`

const NESTED = `---
title: Nested post
description: Nested folder
date: 2025-12-01
tags: [react]
---

Nested body.
`

const DRAFT = `---
title: Draft post
description: Not ready
date: 2025-11-01
draft: true
---

Draft body.
`

const ABOUT = `---
title: About
description: About the blog
---

About body.
`

const BROKEN = `---
title: Broken
description: Bad date
date: yesterday
---

Broken body.
`

function testConfig(): InkaConfig {
  return defineConfig({
    siteUrl: 'https://example.com',
    title: 'Test Blog',
    description: 'Testing inka',
    contentDir: 'content',
    outDir: '.inka',
    publicDir: 'public',
    collections: {
      posts: collection({
        folder: 'posts',
        schema: z.object({
          title: z.string(),
          description: z.string(),
          date: z.coerce.date(),
          tags: z.array(z.string()).default([]),
          draft: z.boolean().default(false),
        }),
        url: (entry) => `/blog/${entry.slug}`,
        sort: { date: 'desc' },
        search: { fields: ['title', 'description', 'tags', 'body'], boost: { title: 3 } },
        rss: true,
      }),
      pages: collection({
        folder: 'pages',
        schema: z.object({ title: z.string(), description: z.string() }),
        url: (entry) => `/${entry.slug}`,
      }),
    },
  })
}

async function createProject(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'inka-build-'))
  created.push(root)

  const defaults: Record<string, string> = {
    'content/posts/hello.md': HELLO,
    'content/posts/2026/nested.md': NESTED,
    'content/posts/draft.md': DRAFT,
    'content/pages/about.md': ABOUT,
  }

  for (const [name, content] of Object.entries({ ...defaults, ...files })) {
    const filePath = path.join(root, name)
    await mkdir(path.dirname(filePath), { recursive: true })
    await writeFile(filePath, content)
  }

  return root
}

async function readOutput(root: string, name: string): Promise<string> {
  return readFile(path.join(root, '.inka', name), 'utf8')
}

describe('build', () => {
  it('generates entries, code and feeds', async () => {
    const root = await createProject({})
    const result = await build({ cwd: root, config: testConfig() })

    expect(result.errors).toEqual([])
    expect(result.entries['posts'].map((entry) => entry.slug)).toEqual([
      'hello',
      '2026/nested',
      'draft',
    ])
    expect(result.entries['pages'].map((entry) => entry.slug)).toEqual(['about'])

    const hello = result.entries['posts'][0]
    expect(hello.url).toBe('/blog/hello')
    expect(hello.collection).toBe('posts')
    expect(hello.filePath).toBe('content/posts/hello.md')
    expect(hello.hasMermaid).toBe(true)
    expect(hello.html).toContain('<pre class="mermaid">')
    expect(hello.body).toContain('## Intro')
    expect(hello.excerpt).toBe('Some text.')
    expect(hello.toc).toEqual([{ depth: 2, text: 'Intro', id: 'intro' }])
    expect(hello['date']).toBeInstanceOf(Date)
  })

  it('writes json, code and feed files', async () => {
    const root = await createProject({})
    await build({ cwd: root, config: testConfig() })

    const index = await readOutput(root, 'index.js')
    expect(index).toContain(`import { createCollection } from 'inka/query'`)
    expect(index).toContain(`import postsEntries from './posts.json'`)
    expect(index).toContain('export const posts = createCollection(postsEntries')
    expect(index).toContain(`dates: ["date"]`)

    const types = await readOutput(root, 'index.d.ts')
    expect(types).toContain('export declare const posts: Collection<Entry>')

    const list = JSON.parse(await readOutput(root, 'posts.list.json')) as Record<string, unknown>[]
    expect(list[0]).not.toHaveProperty('html')
    expect(list[0]).not.toHaveProperty('body')

    const search = JSON.parse(await readOutput(root, 'posts.search.json')) as {
      fields: string[]
      documents: Record<string, unknown>[]
    }
    expect(search.fields).toEqual(['title', 'description', 'tags', 'body'])
    expect(search.documents[0]).toMatchObject({ id: 'hello', url: '/blog/hello' })

    const sitemap = await readOutput(root, 'sitemap.xml')
    expect(sitemap).toContain('<loc>https://example.com/blog/hello</loc>')
    expect(sitemap).toContain('<loc>https://example.com/about</loc>')

    const rss = await readOutput(root, 'rss.xml')
    expect(rss).toContain('<title>Test Blog</title>')
    expect(rss).toContain('<link>https://example.com/blog/hello</link>')
    expect(rss).not.toContain('About the blog')

    const publicSitemap = await readFile(path.join(root, 'public', 'sitemap.xml'), 'utf8')
    expect(publicSitemap).toBe(sitemap)
  })

  it('collects validation errors and skips invalid files', async () => {
    const root = await createProject({ 'content/posts/broken.md': BROKEN })
    const result = await build({ cwd: root, config: testConfig() })

    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toMatchObject({
      file: 'content/posts/broken.md',
      collection: 'posts',
      field: 'date',
      message: 'Expected date, received "yesterday"',
    })
    expect(result.entries['posts'].map((entry) => entry.slug)).not.toContain('broken')
  })

  it('excludes drafts in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    try {
      const root = await createProject({})
      const result = await build({ cwd: root, config: testConfig() })

      expect(result.entries['posts'].map((entry) => entry.slug)).toEqual(['hello', '2026/nested'])

      const sitemap = await readOutput(root, 'sitemap.xml')
      expect(sitemap).not.toContain('/blog/draft')

      const rss = await readOutput(root, 'rss.xml')
      expect(rss).not.toContain('Draft post')
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('fails in production when content is invalid', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    try {
      const root = await createProject({ 'content/posts/broken.md': BROKEN })

      await expect(build({ cwd: root, config: testConfig() })).rejects.toThrow(
        'content/posts/broken.md: "date" — Expected date, received "yesterday"',
      )
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('skips feeds when no site url is configured', async () => {
    const root = await createProject({})
    const config = { ...testConfig(), siteUrl: undefined }
    await build({ cwd: root, config })

    await expect(readOutput(root, 'sitemap.xml')).rejects.toThrow()
  })

  it('loads the config file and generates typed collections', async () => {
    const root = await createProject({
      'inka.config.ts': [
        'const schema = {',
        '  safeParse: (data: Record<string, unknown>) => ({ success: true, data }),',
        '}',
        '',
        'export default {',
        "  contentDir: 'content',",
        "  outDir: '.inka',",
        '  collections: {',
        '    posts: {',
        "      folder: 'posts',",
        '      schema,',
        '      url: (entry: { slug: string }) => `/blog/${entry.slug}`,',
        "      sort: { date: 'desc' },",
        '    },',
        '  },',
        '}',
        '',
      ].join('\n'),
    })

    const result = await build({ cwd: root })

    expect(result.errors).toEqual([])
    expect(result.entries['posts']).toHaveLength(3)

    const types = await readOutput(root, 'index.d.ts')
    expect(types).toContain(`import type config from '../inka.config'`)
    expect(types).toContain(
      'export declare const posts: Collection<EntryOf<typeof config.collections.posts>>',
    )
  })
})
