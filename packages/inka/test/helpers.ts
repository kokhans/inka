import type { Entry } from '../src/types.js'

export function makeEntry(overrides: Partial<Entry> & { slug: string }): Entry {
  return {
    url: `/blog/${overrides.slug}`,
    collection: 'posts',
    filePath: `content/posts/${overrides.slug}.md`,
    html: '<p>body</p>',
    body: 'body',
    excerpt: 'body',
    toc: [],
    readingTime: 1,
    wordCount: 1,
    hasMermaid: false,
    ...overrides,
  }
}
