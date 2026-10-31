export type SeoEntry = {
  title: string
  description: string
  url: string
  excerpt?: string
  date?: Date
  updated?: Date
  cover?: string
}

export type SeoFields = {
  title: string
  description: string
  canonical: string
  publishedTime: string | undefined
  modifiedTime: string | undefined
  image: string | undefined
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
}

export type ReactRouterMeta =
  { title: string } | { name: string; content: string } | { property: string; content: string }

export type BlogPosting = {
  '@context': 'https://schema.org'
  '@type': 'BlogPosting'
  headline: string
  description: string
  url: string
  datePublished?: string
  dateModified?: string
  image?: string
}

export function toSeoFields(entry: SeoEntry): SeoFields {
  const modified = entry.updated ?? entry.date

  return {
    title: entry.title,
    description: entry.description,
    canonical: entry.url,
    publishedTime: entry.date?.toISOString(),
    modifiedTime: modified?.toISOString(),
    image: entry.cover,
  }
}

export function toMetadata(entry: SeoEntry): NextMetadata {
  const fields = toSeoFields(entry)

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
  }
}

export function toMeta(entry: SeoEntry): ReactRouterMeta[] {
  const fields = toSeoFields(entry)
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

  return meta
}

export function jsonLd(entry: SeoEntry): BlogPosting {
  const fields = toSeoFields(entry)

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: fields.title,
    description: fields.description,
    url: fields.canonical,
    ...(fields.publishedTime ? { datePublished: fields.publishedTime } : {}),
    ...(fields.modifiedTime ? { dateModified: fields.modifiedTime } : {}),
    ...(fields.image ? { image: fields.image } : {}),
  }
}
