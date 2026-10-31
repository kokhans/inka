export function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export function joinUrl(siteUrl: string, url: string): string {
  return `${siteUrl.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`
}
