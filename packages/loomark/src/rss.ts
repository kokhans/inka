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
  /** Absolute URL the feed is served from, for `<atom:link rel="self">`. */
  feedUrl?: string
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

  // The newest item date keeps the output stable between builds of the same content.
  const lastBuildDate = options.items
    .map((item) => item.date)
    .reduce<Date | undefined>(
      (latest, date) => (!latest || date > latest ? date : latest),
      undefined,
    )

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeXml(options.title)}</title>`,
    `    <link>${escapeXml(options.siteUrl)}</link>`,
    `    <description>${escapeXml(options.description)}</description>`,
    ...(options.feedUrl
      ? [
          `    <atom:link href="${escapeXml(options.feedUrl)}" rel="self" type="application/rss+xml"/>`,
        ]
      : []),
    ...(lastBuildDate ? [`    <lastBuildDate>${lastBuildDate.toUTCString()}</lastBuildDate>`] : []),
    ...(items ? [items] : []),
    '  </channel>',
    '</rss>',
    '',
  ].join('\n')
}
