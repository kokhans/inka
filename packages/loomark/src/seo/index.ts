import { joinUrl } from '../shared/url.js'

export type SeoAuthor = string | { name: string; url?: string }

export type SeoEntry = {
  title: string
  description: string
  url: string
  excerpt?: string
  date?: Date
  updated?: Date
  cover?: string
  author?: SeoAuthor | SeoAuthor[]
}

export type SeoOptions = {
  /** Makes the canonical URL, `og:url` and relative image paths absolute. */
  siteUrl?: string
  /** Fallback image for entries without a cover. */
  image?: string
  /** Default author for entries without an `author` field. */
  author?: SeoAuthor | SeoAuthor[]
}

export type SeoPerson = { name: string; url?: string }

export type SeoFields = {
  title: string
  description: string
  canonical: string
  publishedTime: string | undefined
  modifiedTime: string | undefined
  image: string | undefined
  authors: SeoPerson[]
}

export type NextMetadata = {
  title: string
  description: string
  alternates: { canonical: string }
  openGraph: {
    title: string
    description: string
    url: string
    type: 'article'
    publishedTime?: string
    modifiedTime?: string
    images?: { url: string }[]
  }
  twitter: {
    card: 'summary_large_image' | 'summary'
    title: string
    description: string
    images?: string[]
  }
  authors?: SeoPerson[]
}

export type ReactRouterMeta =
  { title: string } | { name: string; content: string } | { property: string; content: string }

export type TanStackHead = {
  meta: ReactRouterMeta[]
  links: { rel: 'canonical'; href: string }[]
  scripts: { type: 'application/ld+json'; children: string }[]
}

export type BlogPosting = {
  '@context': 'https://schema.org'
  '@type': 'BlogPosting'
  headline: string
  description: string
  url: string
  datePublished?: string
  dateModified?: string
  image?: string
  author?: JsonLdPerson | JsonLdPerson[]
}

export type JsonLdPerson = { '@type': 'Person'; name: string; url?: string }

export function toSeoFields(entry: SeoEntry, options: SeoOptions = {}): SeoFields {
  const modified = entry.updated ?? entry.date
  const image = entry.cover ?? options.image

  return {
    title: entry.title,
    description: entry.description,
    canonical: absolute(entry.url, options.siteUrl),
    publishedTime: entry.date?.toISOString(),
    modifiedTime: modified?.toISOString(),
    image: image === undefined ? undefined : absolute(image, options.siteUrl),
    authors: toPeople(entry.author ?? options.author),
  }
}

export function toMetadata(entry: SeoEntry, options: SeoOptions = {}): NextMetadata {
  const fields = toSeoFields(entry, options)

  return {
    title: fields.title,
    description: fields.description,
    alternates: { canonical: fields.canonical },
    openGraph: {
      title: fields.title,
      description: fields.description,
      url: fields.canonical,
      type: 'article',
      ...(fields.publishedTime ? { publishedTime: fields.publishedTime } : {}),
      ...(fields.modifiedTime ? { modifiedTime: fields.modifiedTime } : {}),
      ...(fields.image ? { images: [{ url: fields.image }] } : {}),
    },
    twitter: {
      card: fields.image ? 'summary_large_image' : 'summary',
      title: fields.title,
      description: fields.description,
      ...(fields.image ? { images: [fields.image] } : {}),
    },
    ...(fields.authors.length > 0 ? { authors: fields.authors } : {}),
  }
}

export function toMeta(entry: SeoEntry, options: SeoOptions = {}): ReactRouterMeta[] {
  const fields = toSeoFields(entry, options)
  const meta: ReactRouterMeta[] = [
    { title: fields.title },
    { name: 'description', content: fields.description },
    { property: 'og:title', content: fields.title },
    { property: 'og:description', content: fields.description },
    { property: 'og:url', content: fields.canonical },
    { property: 'og:type', content: 'article' },
  ]

  if (fields.publishedTime) {
    meta.push({ property: 'article:published_time', content: fields.publishedTime })
  }
  if (fields.modifiedTime) {
    meta.push({ property: 'article:modified_time', content: fields.modifiedTime })
  }
  if (fields.image) {
    meta.push({ property: 'og:image', content: fields.image })
  }
  if (fields.authors.length > 0) {
    meta.push({ name: 'author', content: fields.authors.map((person) => person.name).join(', ') })
  }

  return meta
}

export function jsonLd(entry: SeoEntry, options: SeoOptions = {}): BlogPosting {
  const fields = toSeoFields(entry, options)
  const people: JsonLdPerson[] = fields.authors.map((person) => ({ '@type': 'Person', ...person }))

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: fields.title,
    description: fields.description,
    url: fields.canonical,
    ...(fields.publishedTime ? { datePublished: fields.publishedTime } : {}),
    ...(fields.modifiedTime ? { dateModified: fields.modifiedTime } : {}),
    ...(fields.image ? { image: fields.image } : {}),
    ...(people.length > 0 ? { author: people.length === 1 ? people[0] : people } : {}),
  }
}

export function toHead(entry: SeoEntry, options: SeoOptions = {}): TanStackHead {
  return {
    meta: toMeta(entry, options),
    links: [{ rel: 'canonical', href: absolute(entry.url, options.siteUrl) }],
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify(jsonLd(entry, options)).replaceAll('<', '\\u003c'),
      },
    ],
  }
}

/** Joins root-relative paths with siteUrl. Absolute URLs and paths without siteUrl are kept. */
function absolute(url: string, siteUrl: string | undefined): string {
  if (!siteUrl || /^[a-z][a-z\d+.-]*:/i.test(url) || url.startsWith('//')) return url
  return joinUrl(siteUrl, url)
}

function toPeople(author: SeoAuthor | SeoAuthor[] | undefined): SeoPerson[] {
  if (author === undefined) return []
  const authors = Array.isArray(author) ? author : [author]
  return authors.map((person) => (typeof person === 'string' ? { name: person } : person))
}
