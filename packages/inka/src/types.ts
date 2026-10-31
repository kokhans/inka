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

export type CollectionOptions<S extends z.ZodType> = {
  folder: string
  schema: S
  url: (entry: Entry<z.output<S>>) => string
  sort?: SortOption
  search?: SearchOption
  rss?: boolean
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
  rss?: boolean
  sitemap?: boolean
  perPage?: number
}

export type InkaConfig = {
  siteUrl?: string
  title?: string
  description?: string
  contentDir?: string
  outDir?: string
  publicDir?: string
  collections: Record<string, RuntimeCollection>
}

export type ValidationError = {
  file: string
  collection: string
  field: string
  message: string
}

export type BuildOptions = {
  cwd?: string
  config?: InkaConfig
  configFile?: string
}

export type BuildResult = {
  entries: Record<string, Entry[]>
  errors: ValidationError[]
}

export type Project = {
  cwd: string
  config: InkaConfig
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
