import { escapeXml } from './shared/url.js'

export type SitemapItem = {
  loc: string
  lastmod?: string
}

export function renderSitemap(items: SitemapItem[]): string {
  const urls = items
    .map((item) => {
      const lastmod = item.lastmod ? `\n    <lastmod>${item.lastmod}</lastmod>` : ''
      return `  <url>\n    <loc>${escapeXml(item.loc)}</loc>${lastmod}\n  </url>`
    })
    .join('\n')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    '</urlset>',
    '',
  ].join('\n')
}
