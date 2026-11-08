import { describe, expect, it } from 'vitest'
import { jsonLd, toHead, toMeta, toMetadata, toSeoFields } from '../src/seo/index.js'

const entry = {
  title: 'Hello Loomark',
  description: 'A first post',
  url: '/blog/hello',
  date: new Date('2026-01-15T00:00:00.000Z'),
  updated: new Date('2026-02-01T00:00:00.000Z'),
  cover: 'https://example.com/cover.png',
}

describe('seo helpers', () => {
  it('maps entry fields once', () => {
    expect(toSeoFields(entry)).toEqual({
      title: 'Hello Loomark',
      description: 'A first post',
      canonical: '/blog/hello',
      publishedTime: '2026-01-15T00:00:00.000Z',
      modifiedTime: '2026-02-01T00:00:00.000Z',
      image: 'https://example.com/cover.png',
      authors: [],
    })
  })

  it('builds next metadata', () => {
    const metadata = toMetadata(entry)

    expect(metadata.title).toBe('Hello Loomark')
    expect(metadata.alternates).toEqual({ canonical: '/blog/hello' })
    expect(metadata.openGraph.publishedTime).toBe('2026-01-15T00:00:00.000Z')
    expect(metadata.openGraph.images).toEqual([{ url: 'https://example.com/cover.png' }])
    expect(metadata.twitter.card).toBe('summary_large_image')
  })

  it('omits optional metadata when there is no cover or updated date', () => {
    const metadata = toMetadata({ title: 'Hi', description: 'Desc', url: '/hi' })

    expect(metadata.openGraph).not.toHaveProperty('images')
    expect(metadata.openGraph).not.toHaveProperty('publishedTime')
    expect(metadata.twitter.card).toBe('summary')
  })

  it('builds tanstack router head options', () => {
    const head = toHead(entry)

    expect(head.meta).toEqual(toMeta(entry))
    expect(head.links).toEqual([{ rel: 'canonical', href: '/blog/hello' }])
    expect(head.scripts).toEqual([
      { type: 'application/ld+json', children: JSON.stringify(jsonLd(entry)) },
    ])
  })

  it('escapes html in tanstack router json-ld', () => {
    const head = toHead({ ...entry, title: '</script><b>' })

    expect(head.scripts[0]?.children).not.toContain('<')
    expect(JSON.parse(head.scripts[0]?.children ?? '')).toMatchObject({ headline: '</script><b>' })
  })

  it('builds react router meta descriptors', () => {
    const meta = toMeta(entry)

    expect(meta[0]).toEqual({ title: 'Hello Loomark' })
    expect(meta).toContainEqual({ name: 'description', content: 'A first post' })
    expect(meta).toContainEqual({ property: 'og:image', content: 'https://example.com/cover.png' })
  })

  it('builds BlogPosting JSON-LD', () => {
    expect(jsonLd(entry)).toEqual({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: 'Hello Loomark',
      description: 'A first post',
      url: '/blog/hello',
      datePublished: '2026-01-15T00:00:00.000Z',
      dateModified: '2026-02-01T00:00:00.000Z',
      image: 'https://example.com/cover.png',
    })
  })
})

describe('seo options', () => {
  const relative = { ...entry, cover: '/images/cover.png' }
  const options = { siteUrl: 'https://myblog.dev/' }

  it('makes canonical URLs and relative images absolute with siteUrl', () => {
    const fields = toSeoFields(relative, options)

    expect(fields.canonical).toBe('https://myblog.dev/blog/hello')
    expect(fields.image).toBe('https://myblog.dev/images/cover.png')
    expect(toSeoFields(entry, options).image).toBe('https://example.com/cover.png')
  })

  it('uses absolute URLs in every helper', () => {
    expect(toMetadata(relative, options).alternates.canonical).toBe('https://myblog.dev/blog/hello')
    expect(toMetadata(relative, options).openGraph.url).toBe('https://myblog.dev/blog/hello')
    expect(toMeta(relative, options)).toContainEqual({
      property: 'og:url',
      content: 'https://myblog.dev/blog/hello',
    })
    expect(toHead(relative, options).links).toEqual([
      { rel: 'canonical', href: 'https://myblog.dev/blog/hello' },
    ])
    expect(jsonLd(relative, options)).toMatchObject({
      url: 'https://myblog.dev/blog/hello',
      image: 'https://myblog.dev/images/cover.png',
    })
  })

  it('falls back to the default image when the entry has no cover', () => {
    const plain = { title: 'Hi', description: 'Desc', url: '/hi' }

    expect(toSeoFields(plain, { ...options, image: '/og.png' }).image).toBe(
      'https://myblog.dev/og.png',
    )
    expect(toSeoFields(entry, { image: '/og.png' }).image).toBe('https://example.com/cover.png')
  })

  it('adds authors from the entry or the default author', () => {
    const ada = { name: 'Ada', url: 'https://ada.dev' }

    expect(jsonLd(entry, { author: ada }).author).toEqual({ '@type': 'Person', ...ada })
    expect(jsonLd({ ...entry, author: ['Ada', 'Grace'] }, { author: 'Default' }).author).toEqual([
      { '@type': 'Person', name: 'Ada' },
      { '@type': 'Person', name: 'Grace' },
    ])
    expect(toMetadata(entry, { author: 'Ada' }).authors).toEqual([{ name: 'Ada' }])
    expect(toMeta({ ...entry, author: ['Ada', 'Grace'] })).toContainEqual({
      name: 'author',
      content: 'Ada, Grace',
    })
    expect(jsonLd(entry)).not.toHaveProperty('author')
    expect(toMetadata(entry)).not.toHaveProperty('authors')
  })
})
