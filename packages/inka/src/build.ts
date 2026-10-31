import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { renderIndexModule, renderIndexTypes, type BuiltCollection } from './codegen.js'
import { createEntry, isDraft } from './entry.js'
import { renderRss, type RssItem } from './rss.js'
import { createSearchIndex } from './search-index.js'
import { isProduction } from './shared/environment.js'
import { sortEntries } from './shared/sort.js'
import { joinUrl } from './shared/url.js'
import { compareValues, isRecord, readField } from './shared/values.js'
import { renderSitemap } from './sitemap.js'
import type {
  BuildOptions,
  BuildResult,
  Entry,
  InkaConfig,
  Project,
  RuntimeCollection,
  ValidationError,
} from './types.js'
import { formatError, reportErrors } from './validate.js'

const DEFAULT_CONFIG_FILE = 'inka.config.ts'
const DEFAULT_CONTENT_DIR = 'content'
const DEFAULT_OUT_DIR = '.inka'
const MARKDOWN_EXTENSION = '.md'
const TYPESCRIPT_EXTENSION = '.ts'

type Feed = {
  name: string
  content: string
}

type LoadedConfig = {
  config: InkaConfig
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
  const errors: ValidationError[] = []
  const collections: BuiltCollection[] = []
  const entries: Record<string, Entry[]> = {}

  for (const [name, definition] of Object.entries(project.config.collections)) {
    const built = await buildCollection(project, name, definition, errors)
    collections.push(built)
    entries[name] = built.entries
  }

  await writeOutput(project, collections)

  if (errors.length > 0) {
    if (isProduction()) {
      const label = errors.length === 1 ? 'file' : 'files'
      const heading = `inka: ${String(errors.length)} invalid content ${label}`
      throw new Error(`${heading}\n${errors.map(formatError).join('\n')}`)
    }
    reportErrors(errors)
  }

  return { entries, errors }
}

async function loadConfig(cwd: string, configFile: string | undefined): Promise<LoadedConfig> {
  const file = path.resolve(cwd, configFile ?? DEFAULT_CONFIG_FILE)
  const loaded = (await import(pathToFileURL(file).href)) as { default?: unknown }

  if (!isRecord(loaded.default) || !isRecord(loaded.default['collections'])) {
    throw new Error(`inka: expected ${file} to default-export a config object with collections`)
  }

  return { config: loaded.default as InkaConfig, configFile: file }
}

async function buildCollection(
  project: Project,
  name: string,
  definition: RuntimeCollection,
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
    })

    if (result.ok) collected.push(result.entry)
    else errors.push(...result.errors)
  }

  const visible = isProduction() ? collected.filter((entry) => !isDraft(entry)) : collected
  return { name, definition, entries: sortEntries(visible, definition.sort) }
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

async function writeOutput(project: Project, collections: BuiltCollection[]): Promise<void> {
  await mkdir(project.outDir, { recursive: true })

  for (const item of collections) {
    await writeJson(path.join(project.outDir, `${item.name}.json`), item.entries)
    await writeJson(
      path.join(project.outDir, `${item.name}.list.json`),
      item.entries.map(toListItem),
    )

    if (item.definition.search) {
      const index = createSearchIndex(item.definition, item.entries)
      await writeJson(path.join(project.outDir, `${item.name}.search.json`), index)
    }
  }

  await writeFile(path.join(project.outDir, 'index.js'), renderIndexModule(collections))
  await writeFile(
    path.join(project.outDir, 'index.d.ts'),
    renderIndexTypes(collections, configImportOf(project)),
  )

  for (const feed of renderFeeds(project, collections)) {
    await writeFile(path.join(project.outDir, feed.name), feed.content)
    if (project.publicDir) {
      await mkdir(project.publicDir, { recursive: true })
      await writeFile(path.join(project.publicDir, feed.name), feed.content)
    }
  }
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

  const rssItems = collections
    .filter((item) => item.definition.rss === true)
    .flatMap((item) => item.entries.map((entry) => toRssItem(entry, siteUrl)))
    .filter((item): item is RssItem => item !== undefined)
    .sort((left, right) => compareValues(right.date, left.date))

  const feeds: Feed[] = [{ name: 'sitemap.xml', content: renderSitemap(sitemapItems) }]
  if (rssItems.length > 0) {
    feeds.push({
      name: 'rss.xml',
      content: renderRss({
        title: project.config.title ?? 'Blog',
        description: project.config.description ?? '',
        siteUrl,
        items: rssItems,
      }),
    })
  }

  return feeds
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

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`)
}
