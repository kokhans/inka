import { describe, expect, it } from 'vitest'
import { renderRss } from '../src/rss.js'
import { renderSitemap } from '../src/sitemap.js'

describe('renderSitemap', () => {
  it('renders urls with optional last modified dates', () => {
    const xml = renderSitemap([
      { loc: 'https://example.com/blog/hello', lastmod: '2026-01-15' },
      { loc: 'https://example.com/about' },
    ])

    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    expect(xml).toContain('<loc>https://example.com/blog/hello</loc>')
    expect(xml).toContain('<lastmod>2026-01-15</lastmod>')
    expect(xml).toContain('<loc>https://example.com/about</loc>')
  })

  it('escapes XML special characters', () => {
    const xml = renderSitemap([{ loc: 'https://example.com/a?b=1&c=2' }])

    expect(xml).toContain('https://example.com/a?b=1&amp;c=2')
  })
})

describe('renderRss', () => {
  it('renders a channel with items', () => {
    const xml = renderRss({
      title: 'Blog',
      description: 'Posts',
      siteUrl: 'https://example.com',
      items: [
        {
          title: 'Hello',
          url: 'https://example.com/blog/hello',
          description: 'A first post',
          date: new Date('2026-01-15T00:00:00.000Z'),
        },
      ],
    })

    expect(xml).toContain('<rss version="2.0">')
    expect(xml).toContain('<title>Blog</title>')
    expect(xml).toContain('<link>https://example.com/blog/hello</link>')
    expect(xml).toContain('<pubDate>Thu, 15 Jan 2026 00:00:00 GMT</pubDate>')
  })

  it('escapes XML special characters', () => {
    const xml = renderRss({
      title: 'A & B',
      description: '<desc>',
      siteUrl: 'https://example.com',
      items: [],
    })

    expect(xml).toContain('<title>A &amp; B</title>')
    expect(xml).toContain('<description>&lt;desc&gt;</description>')
  })
})
