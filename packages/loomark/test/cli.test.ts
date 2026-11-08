import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { HELP, run, type CliIo } from '../src/cli/run.js'

const created: string[] = []

afterAll(async () => {
  await Promise.all(created.map((dir) => rm(dir, { recursive: true, force: true })))
})

const CONFIG = [
  'const schema = {',
  '  safeParse: (data: { title?: unknown }) =>',
  "    typeof data.title === 'string'",
  '      ? { success: true, data }',
  "      : { success: false, error: { issues: [{ path: ['title'], message: 'Required', code: 'custom' }] } },",
  '}',
  'export default {',
  "  collections: { posts: { folder: 'posts', schema, url: () => '/' } },",
  '}',
  '',
].join('\n')

async function createProject(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'loomark-cli-'))
  created.push(root)
  for (const [name, content] of Object.entries({ 'loomark.config.ts': CONFIG, ...files })) {
    const filePath = path.join(root, name)
    await mkdir(path.dirname(filePath), { recursive: true })
    await writeFile(filePath, content)
  }
  return root
}

function fakeIo(): CliIo & { output: string[]; errors: string[] } {
  const output: string[] = []
  const errors: string[] = []
  return {
    output,
    errors,
    log: (message) => output.push(message),
    error: (message) => errors.push(message),
    untilStopped: () => Promise.resolve(),
  }
}

const POST = '---\ntitle: Hello\n---\n\nBody.\n'
const DRAFT = '---\ntitle: Draft\ndraft: true\n---\n\nBody.\n'

describe('loomark cli', () => {
  it('prints help', async () => {
    const io = fakeIo()

    expect(await run(['--help'], io)).toBe(0)
    expect(io.output).toEqual([HELP])
  })

  it('prints help and fails without a command', async () => {
    const io = fakeIo()

    expect(await run([], io)).toBe(1)
    expect(io.output).toEqual([HELP])
  })

  it('rejects unknown commands, options and modes', async () => {
    const unknown = fakeIo()
    expect(await run(['deploy'], unknown)).toBe(1)
    expect(unknown.errors[0]).toContain('unknown command "deploy"')

    const option = fakeIo()
    expect(await run(['build', '--fast'], option)).toBe(1)
    expect(option.errors[0]).toContain("Unknown option '--fast'")

    const mode = fakeIo()
    expect(await run(['build', '--mode', 'staging'], mode)).toBe(1)
    expect(mode.errors).toEqual([
      'loomark: --mode must be development or production, got "staging"',
    ])
  })

  it('builds in production mode by default', async () => {
    const root = await createProject({
      'content/posts/hello.md': POST,
      'content/posts/draft.md': DRAFT,
    })
    const io = fakeIo()

    expect(await run(['build', '--cwd', root], io)).toBe(0)
    expect(io.output[0]).toMatch(/^loomark: built 1 entry in 1 collection \(\d+ ms\)$/)

    const posts = JSON.parse(
      await readFile(path.join(root, '.loomark', 'posts.json'), 'utf8'),
    ) as unknown[]
    expect(posts).toHaveLength(1)
  })

  it('includes drafts in development mode and reads a custom config file', async () => {
    const root = await createProject({
      'config/content.config.ts': CONFIG,
      'content/posts/hello.md': POST,
      'content/posts/draft.md': DRAFT,
    })
    const io = fakeIo()

    const code = await run(
      ['build', '--cwd', root, '--config', 'config/content.config.ts', '--mode', 'development'],
      io,
    )

    expect(code).toBe(0)
    expect(io.output[0]).toContain('built 2 entries in 1 collection')
  })

  it('fails on invalid content in both modes', async () => {
    const root = await createProject({ 'content/posts/broken.md': '---\ndate: 2026-01-01\n---\n' })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const production = fakeIo()
    expect(await run(['build', '--cwd', root], production)).toBe(1)
    expect(production.errors[0]).toContain('loomark: 1 invalid content file')

    const development = fakeIo()
    expect(await run(['build', '--cwd', root, '--mode', 'development'], development)).toBe(1)
    expect(development.errors).toEqual(['loomark: 1 invalid content file'])
    warn.mockRestore()
  })

  it('fails when the config file is missing', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'loomark-cli-'))
    created.push(root)
    const io = fakeIo()

    expect(await run(['build', '--cwd', root], io)).toBe(1)
    expect(io.errors[0]).toContain('loomark.config.ts')
  })

  it('builds, watches and stops', async () => {
    const root = await createProject({ 'content/posts/hello.md': POST })
    const io = fakeIo()

    expect(await run(['watch', '--cwd', root], io)).toBe(0)
    expect(io.output).toEqual(['loomark: watching for changes, press Ctrl+C to stop'])
    await expect(readFile(path.join(root, '.loomark', 'posts.json'), 'utf8')).resolves.toContain(
      'Hello',
    )
  })
})
