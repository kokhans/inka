import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { build } from 'loomark'
import { loomark } from 'loomark/vite'
import { defineConfig } from 'vite'

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

const { entries } = await build()
const posts = entries['posts'] ?? []
const paths = [
  '/',
  '/about',
  '/search',
  '/blog',
  ...posts.map((post) => post.url),
  ...collectTags(posts).map((tag) => `/tags/${tag}`),
]

export default defineConfig({
  plugins: [
    loomark(),
    tailwindcss(),
    tanstackStart({
      prerender: { enabled: true, crawlLinks: false },
      pages: paths.map((path) => ({ path })),
    }),
    viteReact(),
  ],
})
