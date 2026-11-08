import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createJiti } from 'jiti'
import {
  assertCollectionName,
  renderIndexModule,
  renderIndexTypes,
  type BuiltCollection,
} from './codegen.js'
import { createAssets, DEFAULT_ASSETS_DIR, type Assets } from './assets.js'
import { createEntry, isDraft } from './entry.js'
import { readManifest, removeStaleFiles, writeManifest, type Manifest } from './manifest.js'
import { renderRss, type RssItem } from './rss.js'
import { createSearchIndex } from './search-index.js'
import { isProduction } from './shared/environment.js'
import { sortEntries } from './shared/sort.js'
import { joinUrl } from './shared/url.js'
import { compareValues, isRecord, readField } from './shared/values.js'
import { renderSitemap } from './sitemap.js'
import type {
  BuildMode,
  BuildOptions,
  BuildResult,
  Entry,
  LoomarkConfig,
  RssFeedOptions,
  Project,
  RuntimeCollection,
  ValidationError,
} from './types.js'
import { formatError, reportErrors } from './validate.js'

const DEFAULT_CONFIG_FILE = 'loomark.config.ts'
const DEFAULT_CONTENT_DIR = 'content'
const DEFAULT_OUT_DIR = '.loomark'
const MARKDOWN_EXTENSION = '.md'
const TYPESCRIPT_EXTENSION = '.ts'
const COMBINED_FEED = 'rss.xml'
const FEED_FILE = /^[\w.-]+\.xml$/

type Feed = {
  name: string
  content: string
}

type LoadedConfig = {
  config: LoomarkConfig
  configFile: string | undefined
}

export async function resolveProject(options: BuildOptions = {}): Promise<Project> {
  const cwd = options.cwd ?? process.cwd()
  const loaded: LoadedConfig = options.config
    ? { config: options.config, configFile: options.configFile }
    : await loadConfig(cwd, options.configFile)

  return {
    cwd,
    config: loaded.config,
    configFile: loaded.configFile,
    contentDir: path.join(cwd, loaded.config.contentDir ?? DEFAULT_CONTENT_DIR),
    outDir: path.join(cwd, loaded.config.outDir ?? DEFAULT_OUT_DIR),
    publicDir: loaded.config.publicDir ? path.join(cwd, loaded.config.publicDir) : undefined,
  }
}

export async function build(options: BuildOptions = {}): Promise<BuildResult> {
  const project = await resolveProject(options)
  const mode = options.mode ?? (isProduction() ? 'production' : 'development')
  const errors: ValidationError[] = []
  const collections: BuiltCollection[] = []
  const entries: Record<string, Entry[]> = {}

  for (const name of Object.keys(project.config.collections)) assertCollectionName(name)
  assertFeedFiles(project.config)
  warnWithoutSiteUrl(project.config, mode)

  const assets = createAssets(project.publicDir, assetsDirOf(project.config), project.contentDir)

  for (const [name, definition] of Object.entries(project.config.collections)) {
    const built = await buildCollection(project, mode, name, definition, assets, errors)
    collections.push(built)
    entries[name] = built.entries
  }

  const previous = await readManifest(project.outDir)
  const output = await writeOutput(project, collections)
  const images = await assets.write()
  const current: Manifest = {
    outFiles: output.outFiles,
    ...(project.publicDir ? { publicDir: relativePath(project.cwd, project.publicDir) } : {}),
    publicFiles: [...output.publicFiles, ...images.map(toPosix)],
  }
  await removeStaleFiles(project.cwd, project.outDir, previous, current)
  await writeManifest(project.outDir, current)

  if (errors.length > 0) {
    if (mode === 'production') {
      const label = errors.length === 1 ? 'file' : 'files'
      const heading = `loomark: ${String(errors.length)} invalid content ${label}`
      throw new Error(`${heading}\n${errors.map(formatError).join('\n')}`)
    }
    reportErrors(errors)
  }

  return { entries, errors }
}

function assetsDirOf(config: LoomarkConfig): string {
  const dir = path.normalize(config.assetsDir ?? DEFAULT_ASSETS_DIR)
  // The folder is emptied of stale files on every build, so it must never be publicDir itself.
  if (dir === '.' || dir.startsWith('..') || path.isAbsolute(dir)) {
    throw new Error(
      `loomark: assetsDir must be a subfolder of publicDir, got "${config.assetsDir ?? ''}"`,
    )
  }
  return dir
}

async function loadConfig(cwd: string, configFile: string | undefined): Promise<LoadedConfig> {
  const file = path.resolve(cwd, configFile ?? DEFAULT_CONFIG_FILE)
  // A fresh module cache on every load picks up edits to the config and to helpers it imports.
  const jiti = createJiti(import.meta.url, { moduleCache: false })
  const loaded = await jiti.import<{ default?: unknown }>(file)

  if (!isRecord(loaded.default) || !isRecord(loaded.default['collections'])) {
    throw new Error(`loomark: expected ${file} to default-export a config object with collections`)
  }

  return { config: loaded.default as LoomarkConfig, configFile: file }
}

async function buildCollection(
  project: Project,
  mode: BuildMode,
  name: string,
  definition: RuntimeCollection,
  assets: Assets,
  errors: ValidationError[],
): Promise<BuiltCollection> {
  const folder = path.join(project.contentDir, definition.folder)
  const files = await listMarkdownFiles(folder)
  const collected: Entry[] = []

  for (const filePath of files) {
    const source = await readFile(filePath, 'utf8')
    const result = await createEntry({
      source,
      filePath,
      folder,
      cwd: project.cwd,
      collectionName: name,
      definition,
      markdown: project.config.markdown,
      resolveAsset: assets.resolve,
    })

    if (!result.ok) {
      errors.push(...result.errors)
      continue
    }
    // Drafts are left out of production builds, together with their images and image errors.
    if (mode === 'production' && isDraft(result.entry)) continue

    collected.push(result.entry)
    errors.push(...result.errors)
    for (const asset of result.assets) assets.add(asset)
  }

  const unique = dropDuplicateSlugs(collected, name, errors)
  return { name, definition, entries: sortEntries(unique, definition.sort) }
}

function dropDuplicateSlugs(
  entries: Entry[],
  collection: string,
  errors: ValidationError[],
): Entry[] {
  const seen = new Map<string, Entry>()
  for (const entry of entries) {
    const first = seen.get(entry.slug)
    if (!first) {
      seen.set(entry.slug, entry)
      continue
    }
    errors.push({
      file: entry.filePath,
      collection,
      field: 'slug',
      message: `Duplicate slug "${entry.slug}", already used by ${first.filePath}`,
    })
  }
  return [...seen.values()]
}

async function listMarkdownFiles(folder: string): Promise<string[]> {
  const dirents = await readdir(folder, { withFileTypes: true }).catch(() => [])

  const files: string[] = []
  for (const dirent of dirents) {
    const full = path.join(folder, dirent.name)
    if (dirent.isDirectory()) files.push(...(await listMarkdownFiles(full)))
    else if (dirent.name.endsWith(MARKDOWN_EXTENSION)) files.push(full)
  }

  return files.sort()
}

type WrittenOutput = {
  outFiles: string[]
  publicFiles: string[]
}

async function writeOutput(
  project: Project,
  collections: BuiltCollection[],
): Promise<WrittenOutput> {
  await mkdir(project.outDir, { recursive: true })
  const outFiles: string[] = []
  const publicFiles: string[] = []
  const write = async (name: string, content: string): Promise<void> => {
    outFiles.push(name)
    await writeFile(path.join(project.outDir, name), content)
  }

  for (const item of collections) {
    await write(`${item.name}.json`, toJson(item.entries))
    await write(`${item.name}.list.json`, toJson(item.entries.map(toListItem)))

    if (item.definition.search) {
      const index = createSearchIndex(item.definition, item.entries)
      await write(`${item.name}.search.json`, toJson(index))
    }
  }

  await write('index.js', renderIndexModule(collections))
  await write('index.d.ts', renderIndexTypes(collections, configImportOf(project)))

  for (const feed of renderFeeds(project, collections)) {
    await write(feed.name, feed.content)
    if (project.publicDir) {
      await mkdir(project.publicDir, { recursive: true })
      await writeFile(path.join(project.publicDir, feed.name), feed.content)
      publicFiles.push(feed.name)
    }
  }

  return { outFiles, publicFiles }
}

function relativePath(from: string, to: string): string {
  return toPosix(path.relative(from, to)) || '.'
}

function toPosix(file: string): string {
  return file.split(path.sep).join('/')
}

function renderFeeds(project: Project, collections: BuiltCollection[]): Feed[] {
  const siteUrl = project.config.siteUrl
  if (!siteUrl) return []

  const sitemapItems = collections
    .filter((item) => item.definition.sitemap !== false)
    .flatMap((item) =>
      item.entries.map((entry) => ({
        loc: joinUrl(siteUrl, entry.url),
        lastmod: lastModified(entry),
      })),
    )

  const feeds: Feed[] = [{ name: 'sitemap.xml', content: renderSitemap(sitemapItems) }]
  const renderFeed = (
    name: string,
    included: BuiltCollection[],
    options: RssFeedOptions = {},
  ): Feed => ({
    name,
    content: renderRss({
      title: options.title ?? project.config.title ?? 'Blog',
      description: options.description ?? project.config.description ?? '',
      siteUrl,
      feedUrl: joinUrl(siteUrl, name),
      items: rssItemsOf(included, siteUrl),
    }),
  })

  // `rss: true` collections share rss.xml, which is only written when it has items.
  const combined = collections.filter((item) => item.definition.rss === true)
  if (rssItemsOf(combined, siteUrl).length > 0) feeds.push(renderFeed(COMBINED_FEED, combined))

  for (const item of collections) {
    const options = item.definition.rss
    if (typeof options === 'object') {
      feeds.push(renderFeed(feedFileOf(item.name, options), [item], options))
    }
  }

  return feeds
}

function rssItemsOf(collections: BuiltCollection[], siteUrl: string): RssItem[] {
  return collections
    .flatMap((item) => item.entries.map((entry) => toRssItem(entry, siteUrl)))
    .filter((item): item is RssItem => item !== undefined)
    .sort((left, right) => compareValues(right.date, left.date))
}

function feedFileOf(collection: string, options: RssFeedOptions): string {
  return options.file ?? `${collection}.xml`
}

/** Feed files share the output folder with each other and with sitemap.xml, so names must differ. */
function assertFeedFiles(config: LoomarkConfig): void {
  const used = new Set(['sitemap.xml', COMBINED_FEED])
  for (const [name, definition] of Object.entries(config.collections)) {
    if (typeof definition.rss !== 'object') continue
    const file = feedFileOf(name, definition.rss)
    if (!FEED_FILE.test(file)) {
      throw new Error(
        `loomark: invalid rss file "${file}" in collection "${name}". Use a file name such as "posts.xml".`,
      )
    }
    if (used.has(file)) {
      throw new Error(`loomark: rss file "${file}" of collection "${name}" is already used`)
    }
    used.add(file)
  }
}

let warnedAboutSiteUrl = false

/** Feeds need absolute URLs, so they are skipped without siteUrl. Say so where it matters. */
function warnWithoutSiteUrl(config: LoomarkConfig, mode: BuildMode): void {
  if (config.siteUrl || warnedAboutSiteUrl) return
  const wantsRss = Object.values(config.collections).some((item) => item.rss)
  if (mode !== 'production' && !wantsRss) return

  warnedAboutSiteUrl = true
  console.warn('loomark: siteUrl is not set, so sitemap.xml and the RSS feeds are not generated')
}

function toRssItem(entry: Entry, siteUrl: string): RssItem | undefined {
  const title = readField(entry, 'title')
  const date = readField(entry, 'date')
  if (typeof title !== 'string' || !(date instanceof Date)) return undefined

  const description = readField(entry, 'description')
  return {
    title,
    url: joinUrl(siteUrl, entry.url),
    description: typeof description === 'string' ? description : entry.excerpt,
    date,
  }
}

function lastModified(entry: Entry): string | undefined {
  const updated = readField(entry, 'updated') ?? readField(entry, 'date')
  return updated instanceof Date ? updated.toISOString().slice(0, 10) : undefined
}

function toListItem(entry: Entry): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...entry }
  delete copy['html']
  delete copy['body']
  return copy
}

function configImportOf(project: Project): string | undefined {
  const configFile = project.configFile
  if (!configFile?.endsWith(TYPESCRIPT_EXTENSION)) return undefined

  const relative = path
    .relative(project.outDir, configFile)
    .slice(0, -TYPESCRIPT_EXTENSION.length)
    .split(path.sep)
    .join('/')

  return relative.startsWith('.') ? relative : `./${relative}`
}

function toJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}
