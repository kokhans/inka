# Inka

Build-time Markdown content library for React apps. Works with Next.js and React Router v8.

```bash
pnpm add inka
```

```ts
import { collection, defineConfig, z } from 'inka'

export default defineConfig({
  siteUrl: 'https://myblog.dev',
  collections: {
    posts: collection({
      folder: 'posts',
      schema: z.object({ title: z.string(), date: z.coerce.date() }),
      url: (entry) => `/blog/${entry.slug}`,
      sort: { date: 'desc' },
    }),
  },
})
```

```ts
import { posts } from '#inka'

const page = posts.query({ where: { tags: { has: 'react' } }, page: 2, perPage: 10 })
```

Full documentation, the query API, the `build()` API and the Mermaid setup live in the
[repository README](https://github.com/serhiikokhan/inka#readme).
