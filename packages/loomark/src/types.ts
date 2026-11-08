import type {
  BundledLanguage,
  BundledTheme,
  LanguageRegistration,
  ThemeRegistrationAny,
} from 'shiki'
import type { PluggableList } from 'unified'
import type { z } from 'zod'

export type EntryFields = Record<string, unknown>

export type TocItem = {
  depth: number
  text: string
  id: string
}

export type EntryMeta = {
  slug: string
  url: string
  collection: string
  filePath: string
  html: string
  body: string
  excerpt: string
  toc: TocItem[]
  readingTime: number
  wordCount: number
  hasMermaid: boolean
}

export type Entry<T = EntryFields> = T & EntryMeta

export type SortDirection = 'asc' | 'desc'

export type SortOption = Record<string, SortDirection>

export type SearchOption = {
  fields: string[]
  boost?: Record<string, number>
}

export type RssFeedOptions = {
  /** File name of the feed, written next to `rss.xml`. Defaults to `<collection>.xml`. */
  file?: string
  /** Defaults to the config title. */
  title?: string
  /** Defaults to the config description. */
  description?: string
}

export type CollectionOptions<S extends z.ZodType> = {
  folder: string
  schema: S
  url: (entry: Entry<z.output<S>>) => string
  sort?: SortOption
  search?: SearchOption
  /** `true` adds entries to `rss.xml`. An object gives the collection its own feed. */
  rss?: boolean | RssFeedOptions
  sitemap?: boolean
  perPage?: number
}

export type CollectionDefinition<S extends z.ZodType> = CollectionOptions<S>

export type RuntimeCollection = {
  folder: string
  schema: z.ZodType
  url: (entry: never) => string
  sort?: SortOption
  search?: SearchOption
  /** `true` adds entries to `rss.xml`. An object gives the collection its own feed. */
  rss?: boolean | RssFeedOptions
  sitemap?: boolean
  perPage?: number
}

export type ShikiTheme = BundledTheme | ThemeRegistrationAny

export type MarkdownOptions = {
  /** Remark plugins, run after GitHub Flavored Markdown. */
  remarkPlugins?: PluggableList
  /** Rehype plugins, run after heading ids are added and before code is highlighted. */
  rehypePlugins?: PluggableList
  shiki?: {
    /** Light and dark themes. Defaults to `github-light` and `github-dark`. */
    themes?: { light: ShikiTheme; dark: ShikiTheme }
    /** Extra languages. Every language bundled with Shiki is loaded on demand already. */
    langs?: (BundledLanguage | LanguageRegistration)[]
  }
}

export type LoomarkConfig = {
  siteUrl?: string
  title?: string
  description?: string
  contentDir?: string
  outDir?: string
  publicDir?: string
  /** Folder inside publicDir for images next to Markdown files. Defaults to `loomark`. */
  assetsDir?: string
  markdown?: MarkdownOptions
  collections: Record<string, RuntimeCollection>
}

export type ValidationError = {
  file: string
  collection: string
  field: string
  message: string
}

export type BuildMode = 'development' | 'production'

export type BuildOptions = {
  cwd?: string
  config?: LoomarkConfig
  configFile?: string
  mode?: BuildMode
}

export type BuildResult = {
  entries: Record<string, Entry[]>
  errors: ValidationError[]
}

export type Project = {
  cwd: string
  config: LoomarkConfig
  configFile: string | undefined
  contentDir: string
  outDir: string
  publicDir: string | undefined
}

export type EntryOf<C> = C extends { schema: infer S }
  ? S extends z.ZodType
    ? Entry<z.output<S>>
    : Entry
  : Entry
