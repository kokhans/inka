import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { build } from '../src/build.js'
import { collection, defineConfig } from '../src/config.js'
import type { LoomarkConfig } from '../src/types.js'

const created: string[] = []

afterAll(async () => {
  await Promise.all(created.map((dir) => rm(dir, { recursive: true, force: true })))
})

function post(body: string, frontmatter = ''): string {
  return `---\ntitle: Post\n${frontmatter}---\n\n${body}\n`
}

function testConfig(overrides: Partial<LoomarkConfig> = {}): LoomarkConfig {
  return defineConfig({
    publicDir: 'public',
    collections: {
      posts: collection({
        folder: 'posts',
        schema: z.object({
          title: z.string(),
          cover: z.string().optional(),
          draft: z.boolean().default(false),
        }),
        url: (entry) => `/blog/${entry.slug}`,
      }),
    },
    ...overrides,
  })
}

async function createProject(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'loomark-assets-'))
  created.push(root)
  for (const [name, content] of Object.entries(files)) {
    const filePath = path.join(root, name)
    await mkdir(path.dirname(filePath), { recursive: true })
    await writeFile(filePath, content)
  }
  return root
}

async function copiedImages(root: string, dir = 'loomark'): Promise<string[]> {
  return (await readdir(path.join(root, 'public', dir)).catch(() => [])).sort()
}

describe('co-located images', () => {
  it('copies relative images to the public folder and rewrites their paths', async () => {
    const root = await createProject({
      'content/posts/hello/index.md': post(
        '![Diagram](./diagram.png) ![Shared](../shared/logo.png)',
        'cover: ./cover.png\n',
      ),
      'content/posts/hello/diagram.png': 'diagram',
      'content/posts/hello/cover.png': 'cover',
      'content/posts/shared/logo.png': 'logo',
    })

    const { entries, errors } = await build({ cwd: root, config: testConfig() })
    const entry = entries['posts'][0]

    expect(errors).toEqual([])
    expect(entry.html).toMatch(/src="\/loomark\/diagram-[\da-f]{8}\.png"/)
    expect(entry.html).toMatch(/src="\/loomark\/logo-[\da-f]{8}\.png"/)
    expect(entry['cover']).toMatch(/^\/loomark\/cover-[\da-f]{8}\.png$/)

    const images = await copiedImages(root)
    expect(images).toHaveLength(3)
    expect(images.map((name) => `/loomark/${name}`)).toContain(entry['cover'])
  })

  it('keeps URLs and root paths as written', async () => {
    const root = await createProject({
      'content/posts/hello.md': post(
        '![A](https://example.com/a.png) ![B](/b.png) ![C](data:image/png;base64,AAAA)',
        'cover: /cover.png\n',
      ),
    })

    const { entries, errors } = await build({ cwd: root, config: testConfig() })

    expect(errors).toEqual([])
    expect(entries['posts'][0].html).toContain('src="https://example.com/a.png"')
    expect(entries['posts'][0].html).toContain('src="/b.png"')
    expect(entries['posts'][0]['cover']).toBe('/cover.png')
    expect(await copiedImages(root)).toEqual([])
  })

  it('reports missing images and fails production builds', async () => {
    const root = await createProject({
      'content/posts/hello.md': post('![Missing](./missing.png)', 'cover: ./gone.png\n'),
    })

    const { errors } = await build({ cwd: root, config: testConfig(), mode: 'development' })

    expect(errors).toEqual([
      expect.objectContaining({ field: 'cover', message: 'Image not found: ./gone.png' }),
      expect.objectContaining({ field: 'body', message: 'Image not found: ./missing.png' }),
    ])
    await expect(build({ cwd: root, config: testConfig(), mode: 'production' })).rejects.toThrow(
      'Image not found: ./missing.png',
    )
  })

  it('reports relative images when no public folder is configured', async () => {
    const root = await createProject({
      'content/posts/hello.md': post('![Diagram](./diagram.png)'),
      'content/posts/diagram.png': 'diagram',
    })

    const { errors } = await build({
      cwd: root,
      config: testConfig({ publicDir: undefined }),
      mode: 'development',
    })

    expect(errors).toEqual([
      expect.objectContaining({
        field: 'body',
        message: 'Set publicDir in the config to copy the image ./diagram.png',
      }),
    ])
  })

  it('leaves images of drafts out of production builds', async () => {
    const root = await createProject({
      'content/posts/draft.md': post(
        '![Secret](./secret.png) ![Gone](./gone.png)',
        'draft: true\n',
      ),
      'content/posts/secret.png': 'secret',
    })

    const { errors } = await build({ cwd: root, config: testConfig(), mode: 'production' })

    expect(errors).toEqual([])
    expect(await copiedImages(root)).toEqual([])
  })

  it('removes copies that are no longer referenced', async () => {
    const root = await createProject({
      'content/posts/hello.md': post('![Diagram](./diagram.png)'),
      'content/posts/diagram.png': 'diagram',
    })
    await build({ cwd: root, config: testConfig() })
    expect(await copiedImages(root)).toHaveLength(1)

    await writeFile(path.join(root, 'content/posts/hello.md'), post('No images.'))
    await build({ cwd: root, config: testConfig() })

    expect(await copiedImages(root)).toEqual([])
  })

  it('uses a custom assets folder and rejects folders outside the public folder', async () => {
    const root = await createProject({
      'content/posts/hello.md': post('![Diagram](./diagram.png)'),
      'content/posts/diagram.png': 'diagram',
    })

    const { entries } = await build({ cwd: root, config: testConfig({ assetsDir: 'media/blog' }) })

    expect(entries['posts'][0].html).toMatch(/src="\/media\/blog\/diagram-[\da-f]{8}\.png"/)
    expect(await copiedImages(root, 'media/blog')).toHaveLength(1)
    for (const assetsDir of ['.', '../outside', '']) {
      await expect(build({ cwd: root, config: testConfig({ assetsDir }) })).rejects.toThrow(
        'assetsDir must be a subfolder of publicDir',
      )
    }
  })
})
