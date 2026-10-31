import type { Config } from '@react-router/dev/config'
import { build } from 'inka'

function collectTags(posts: Record<string, unknown>[]): string[] {
  const tags = new Set<string>()

  for (const post of posts) {
    const value = post['tags']
    if (!Array.isArray(value)) continue
    for (const tag of value) {
      if (typeof tag === 'string') tags.add(tag)
    }
  }

  return [...tags]
}

export default {
  async prerender() {
    const { entries } = await build()
    const posts = entries['posts'] ?? []

    return [
      '/',
      '/about',
      '/search',
      '/blog',
      ...posts.map((post) => post.url),
      ...collectTags(posts).map((tag) => `/tags/${tag}`),
    ]
  },
} satisfies Config
