import { describe, expect, it } from 'vitest'
import { jsonLd, toMeta, toMetadata, toSeoFields } from '../src/seo/index.js'

const entry = {
  title: 'Hello Inka',
  description: 'A first post',
  url: '/blog/hello',
  date: new Date('2026-01-15T00:00:00.000Z'),
  updated: new Date('2026-02-01T00:00:00.000Z'),
  cover: 'https://example.com/cover.png',
}

describe('seo helpers', () => {
  it('maps entry fields once', () => {
    expect(toSeoFields(entry)).toEqual({
      title: 'Hello Inka',
      description: 'A first post',
      canonical: '/blog/hello',
      publishedTime: '2026-01-15T00:00:00.000Z',
      modifiedTime: '2026-02-01T00:00:00.000Z',
      image: 'https://example.com/cover.png',
    })
  })

  it('builds next metadata', () => {
    const metadata = toMetadata(entry)

    expect(metadata.title).toBe('Hello Inka')
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

  it('builds react router meta descriptors', () => {
    const meta = toMeta(entry)

    expect(meta[0]).toEqual({ title: 'Hello Inka' })
    expect(meta).toContainEqual({ name: 'description', content: 'A first post' })
    expect(meta).toContainEqual({ property: 'og:image', content: 'https://example.com/cover.png' })
  })

  it('builds BlogPosting JSON-LD', () => {
    expect(jsonLd(entry)).toEqual({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: 'Hello Inka',
      description: 'A first post',
      url: '/blog/hello',
      datePublished: '2026-01-15T00:00:00.000Z',
      dateModified: '2026-02-01T00:00:00.000Z',
      image: 'https://example.com/cover.png',
    })
  })
})
