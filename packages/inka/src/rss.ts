import { escapeXml } from './shared/url.js'

export type RssItem = {
  title: string
  url: string
  description: string
  date: Date
}

export type RssOptions = {
  title: string
  description: string
  siteUrl: string
  items: RssItem[]
}

export function renderRss(options: RssOptions): string {
  const items = options.items
    .map((item) => {
      return [
        '    <item>',
        `      <title>${escapeXml(item.title)}</title>`,
        `      <link>${escapeXml(item.url)}</link>`,
        `      <guid>${escapeXml(item.url)}</guid>`,
        `      <description>${escapeXml(item.description)}</description>`,
        `      <pubDate>${item.date.toUTCString()}</pubDate>`,
        '    </item>',
      ].join('\n')
    })
    .join('\n')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '  <channel>',
    `    <title>${escapeXml(options.title)}</title>`,
    `    <link>${escapeXml(options.siteUrl)}</link>`,
    `    <description>${escapeXml(options.description)}</description>`,
    items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n')
}
