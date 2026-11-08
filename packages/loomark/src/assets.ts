import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, readdir, rm } from 'node:fs/promises'
import path from 'node:path'

export const DEFAULT_ASSETS_DIR = 'loomark'

export type Asset = {
  /** Source file next to the Markdown file. */
  file: string
  /** File name inside the assets folder. */
  name: string
  url: string
}

export type AssetResult = { asset: Asset } | { error: string } | undefined

export type Assets = {
  /**
   * Resolves `src` relative to the Markdown file. Returns undefined when `src` is not a relative
   * path, so URLs and root paths such as `/logo.png` stay as written.
   */
  resolve: (markdownFile: string, src: string) => Promise<AssetResult>
  /** Marks an asset to be copied by `write()`. Only assets of published entries are added. */
  add: (asset: Asset) => void
  /** Copies every added asset and removes copies no longer referenced. */
  write: () => Promise<void>
}

const URL_SCHEME = /^[a-z][a-z\d+.-]*:/i

export function createAssets(publicDir: string | undefined, assetsDir: string): Assets {
  const copies = new Map<string, string>()
  const urlBase = `/${assetsDir.split(path.sep).filter(Boolean).join('/')}`

  async function resolve(markdownFile: string, src: string): Promise<AssetResult> {
    if (!isRelative(src)) return undefined

    const file = path.resolve(path.dirname(markdownFile), decodePath(stripQuery(src)))
    const content = await readFile(file).catch(() => undefined)
    if (!content) return { error: `Image not found: ${src}` }
    if (!publicDir) return { error: `Set publicDir in the config to copy the image ${src}` }

    const hash = createHash('sha256').update(content).digest('hex').slice(0, 8)
    const extension = path.extname(file)
    const name = `${path.basename(file, extension)}-${hash}${extension}`
    return { asset: { file, name, url: `${urlBase}/${encodeURIComponent(name)}` } }
  }

  function add(asset: Asset): void {
    copies.set(asset.name, asset.file)
  }

  async function write(): Promise<void> {
    if (!publicDir) return
    const target = path.join(publicDir, assetsDir)

    if (copies.size > 0) await mkdir(target, { recursive: true })
    for (const [name, file] of copies) await copyFile(file, path.join(target, name))

    const existing = await readdir(target, { withFileTypes: true }).catch(() => [])
    const stale = existing.filter((dirent) => dirent.isFile() && !copies.has(dirent.name))
    await Promise.all(stale.map((dirent) => rm(path.join(target, dirent.name), { force: true })))
  }

  return { resolve, add, write }
}

export function isRelative(src: string): boolean {
  return src.length > 0 && !URL_SCHEME.test(src) && !src.startsWith('/') && !src.startsWith('#')
}

function decodePath(src: string): string {
  try {
    return decodeURI(src)
  } catch {
    return src
  }
}

function stripQuery(src: string): string {
  return src.replace(/[?#].*$/, '')
}
