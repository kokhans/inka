# Inka

Inka turns folders of Markdown files with YAML frontmatter into typed, queryable content for
React apps. It works with **Next.js (App Router)** and **React Router v8 (framework mode)**.

Content is edited by hand in your editor. There is no admin UI, no database and no CLI.

- Everything is generated at build time: JSON data, TypeScript types, a search index,
  `sitemap.xml` and `rss.xml`. No Markdown parsing at runtime, no `import.meta.glob`.
- The app imports typed collections and queries them on the server or in the browser.
- The runtime API ships without dependencies. Markdown, Shiki and the search index are built once.

## Requirements

- Node.js 22 or newer
- ESM only

## Quick start: Next.js

```bash
pnpm add inka
```

`inka.config.ts` in the project root:

```ts
import { collection, defineConfig, z } from 'inka'

export default defineConfig({
  siteUrl: 'https://myblog.dev',
  title: 'My blog',
  description: 'Notes about building for the web.',
  publicDir: 'public',
  collections: {
    posts: collection({
      folder: 'posts',
      schema: z.object({
        title: z.string(),
        description: z.string(),
        date: z.coerce.date(),
        updated: z.coerce.date().optional(),
        tags: z.array(z.string()).default([]),
        cover: z.string().optional(),
        draft: z.boolean().default(false),
      }),
      url: (entry) => `/blog/${entry.slug}`,
      sort: { date: 'desc' },
      search: { fields: ['title', 'description', 'tags', 'body'], boost: { title: 3 } },
      rss: true,
      sitemap: true,
    }),
  },
})
```

`next.config.ts`:

```ts
import { withInka } from 'inka/next'

export default withInka({
  reactStrictMode: true,
})
```

`withInka` runs `build()` before the config is handed to Next.js, so `next build` and `next dev`
always start from fresh content. In development it also watches the content folder and rebuilds
when a Markdown file changes.

Map the `#inka` alias in `package.json`:

```json
{
  "imports": {
    "#inka": "./.inka/index.js",
    "#inka/*": "./.inka/*"
  }
}
```

Add `.inka/` to `.gitignore`, then use the generated collections:

```tsx
import { posts } from '#inka'

export default async function BlogPage() {
  const { items, totalPages } = posts.query({ page: 1, perPage: 10 })
  return <PostList posts={items} />
}
```

## Quick start: React Router v8

`vite.config.ts`:

```ts
import { reactRouter } from '@react-router/dev/vite'
import { defineConfig } from 'vite'
import { inka } from 'inka/vite'

export default defineConfig({
  plugins: [inka(), reactRouter()],
})
```

`inka()` runs `build()` when the dev server or a production build starts, rebuilds on Markdown
changes with the Vite watcher, and triggers a reload.

Dynamic routes are prerendered from the same data:

```ts
import type { Config } from '@react-router/dev/config'
import { build } from 'inka'

export default {
  async prerender() {
    const { entries } = await build()
    const posts = entries['posts'] ?? []

    return ['/', '/blog', ...posts.map((post) => post.url)]
  },
} satisfies Config
```

The `package.json` `imports` alias and the `.gitignore` entry are the same as for Next.js.

## Configuration

`defineConfig()` takes:

| Field         | Default     | Description                                                         |
| ------------- | ----------- | ------------------------------------------------------------------- |
| `siteUrl`     | –           | Absolute URL of the site. Required for `sitemap.xml` and `rss.xml`. |
| `title`       | `'Blog'`    | Feed title.                                                         |
| `description` | `''`        | Feed description.                                                   |
| `contentDir`  | `'content'` | Folder that holds the collections.                                  |
| `outDir`      | `'.inka'`   | Folder for the generated output.                                    |
| `publicDir`   | –           | When set, the feeds are also copied there.                          |
| `collections` | –           | Collection definitions keyed by name.                               |

`collection()` takes:

| Field     | Default | Description                                                                   |
| --------- | ------- | ----------------------------------------------------------------------------- |
| `folder`  | –       | Folder inside `contentDir`. Nested folders become nested slugs.               |
| `schema`  | –       | Zod schema for the frontmatter. Inferred types flow into the generated types. |
| `url`     | –       | `(entry) => string`. Receives the validated entry and its slug.               |
| `sort`    | –       | Default sort, for example `{ date: 'desc' }`.                                 |
| `search`  | –       | `{ fields, boost }`. Enables `<collection>.search.json`.                      |
| `perPage` | `10`    | Default page size for `query()`.                                              |
| `rss`     | `false` | Include the collection in `rss.xml`.                                          |
| `sitemap` | `true`  | Include the collection in `sitemap.xml`.                                      |

### Slugs and URLs

The slug comes from the file path relative to the collection folder: `posts/2026/my-post.md`
becomes `2026/my-post`. A `slug` field in the frontmatter overrides it.

### Drafts

An entry with `draft: true` stays visible while `NODE_ENV !== 'production'`. Production builds
drop it from the JSON output, the sitemap and the RSS feed.

### Validation

Frontmatter is validated with the Zod schema of the collection. Errors name the file, the field
and the reason:

```text
content/posts/hello.md: "date" — Expected date, received "yesterday"
```

In development the error is printed as a warning and the remaining content is still generated.
In production it fails the build.

## Generated output

```text
.inka/
  index.js               createCollection() calls for every collection
  index.d.ts             types inferred from the Zod schemas
  posts.json             full entries, including html and body
  posts.list.json        entries without html and body
  posts.search.json      the search index
  sitemap.xml
  rss.xml
```

`index.d.ts` points back to your config, so entry types stay in sync with the schemas:

```ts
import type { Collection } from 'inka/query'
import type { EntryOf } from 'inka'
import type config from '../inka.config'

export declare const posts: Collection<EntryOf<typeof config.collections.posts>>
```

### Entry shape

Every entry contains the validated frontmatter fields plus:

| Field         | Description                                                      |
| ------------- | ---------------------------------------------------------------- |
| `slug`        | Slug from the file path or the frontmatter override.             |
| `url`         | Result of the collection `url` function.                         |
| `collection`  | Name of the collection.                                          |
| `filePath`    | Path relative to the project root.                               |
| `html`        | Rendered HTML.                                                   |
| `body`        | Raw Markdown without frontmatter.                                |
| `excerpt`     | First paragraph, or the `excerpt` field when the schema has one. |
| `toc`         | `[{ depth, text, id }]` for `h1`–`h4`.                           |
| `readingTime` | Minutes at 200 words per minute.                                 |
| `wordCount`   | Number of words in the body.                                     |
| `hasMermaid`  | `true` when the body contains a Mermaid diagram.                 |

Date fields become `Date` instances at runtime.

## Query API

```ts
import { posts } from '#inka'
```

| Method                    | Returns                                                                 |
| ------------------------- | ----------------------------------------------------------------------- |
| `all(options?)`           | Every entry, sorted by the collection sort.                             |
| `list()`                  | Every entry without `html` and `body`.                                  |
| `get(slug)`               | One entry or `undefined`.                                               |
| `query(options?)`         | `{ items, total, page, perPage, totalPages, hasNext, hasPrev }`.        |
| `distinct(field)`         | `[{ value, count }]`, most common first.                                |
| `adjacent(slug)`          | `{ prev, next }` based on the collection sort.                          |
| `related(slug, options?)` | Entries sharing values of `by` (default `tags`), `limit` defaults to 3. |

### Filtering

```ts
posts.query({
  where: {
    tags: { has: 'react' },
    date: { gte: new Date('2026-01-01') },
    title: { contains: 'hydration' },
    draft: false,
  },
  sort: { date: 'desc' },
  search: 'streaming',
  page: 2,
  perPage: 10,
})
```

| Operator                 | Matches when                                            |
| ------------------------ | ------------------------------------------------------- |
| plain value, `equals`    | The values are equal.                                   |
| `in`                     | The value is one of the given values.                   |
| `has`                    | The array field contains the value.                     |
| `hasSome`                | The array field contains at least one given value.      |
| `hasEvery`               | The array field contains every given value.             |
| `gt`, `gte`, `lt`, `lte` | Comparison for numbers, dates and strings.              |
| `contains`               | The string field contains the substring, ignoring case. |
| `not`                    | The value does not match the given value or filter.     |

Fields are combined with `and`.

### Sorting and pagination

`sort` overrides the collection sort for a single query. Missing values are sorted last.
`page` is clamped to the available range, so an out-of-range page returns the last page instead
of an empty list. `perPage` defaults to the collection `perPage` and then to `10`.

### Selecting fields

```ts
const titles = posts.all({ select: ['title', 'slug'] })
const page = posts.query({ select: ['title'], perPage: 5 })
```

### Related entries

```ts
posts.related('hydration-explained', { by: 'tags', limit: 3 })
```

## Client-side search

The search index is a separate JSON file, so it never ends up in the main bundle:

```tsx
import { createSearch } from 'inka/search'
import searchIndex from '#inka/posts.search.json'

const search = createSearch(searchIndex)
const hits = search.search('hydration', { limit: 10 })
```

Every hit contains `id`, `url`, `score` and the stored search fields.

## Mermaid diagrams

A fenced `mermaid` block is not highlighted. It is emitted as `<pre class="mermaid">` with the
diagram source, and the entry gets `hasMermaid: true`.

```tsx
import { useEffect, useRef } from 'react'
import { renderMermaid } from 'inka/mermaid'

export function Article({ html, hasMermaid }: { html: string; hasMermaid: boolean }) {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!hasMermaid || !container.current) return
    void renderMermaid(container.current, { theme: 'auto' })
  }, [hasMermaid])

  return <div ref={container} dangerouslySetInnerHTML={{ __html: html }} />
}
```

`renderMermaid(root?, options?)` loads `mermaid` with a dynamic `import()`, so pages without
diagrams never download it. `mermaid` is an optional peer dependency. The `theme` option accepts
`'auto'`, `'light'` and `'dark'`; `'auto'` follows `prefers-color-scheme`.

## Code block styling

Shiki renders both themes into CSS variables. Add this to your stylesheet:

```css
.shiki,
.shiki span {
  color: var(--shiki-light);
}

.shiki {
  background-color: var(--shiki-light-bg);
}

@media (prefers-color-scheme: dark) {
  .shiki,
  .shiki span {
    color: var(--shiki-dark);
  }

  .shiki {
    background-color: var(--shiki-dark-bg);
  }
}
```

## SEO helpers

`inka/seo` maps one entry to the shape each framework expects:

```ts
import { jsonLd, toMetadata } from 'inka/seo'

export async function generateMetadata({ params }) {
  const post = posts.get((await params).slug)
  return post ? toMetadata(post) : {}
}
```

```ts
import { jsonLd, toMeta } from 'inka/seo'

export function meta({ data }) {
  return [...toMeta(data.post), { 'script:ld+json': jsonLd(data.post) }]
}
```

- `toMetadata(entry)` returns a Next.js `Metadata` object.
- `toMeta(entry)` returns React Router meta descriptors.
- `jsonLd(entry)` returns a schema.org `BlogPosting` object.

All three use the same field mapper, so title, description, canonical URL and dates stay
consistent.

## `build()` API

```ts
import { build } from 'inka'

const { entries, errors } = await build()
```

`build()` loads `inka.config.ts`, generates `.inka/` and returns every entry per collection
together with the validation errors. Both integrations call it, and you can call it from your own
scripts.

Options:

| Option       | Default            | Description                                |
| ------------ | ------------------ | ------------------------------------------ |
| `cwd`        | `process.cwd()`    | Project root.                              |
| `config`     | –                  | Inline config instead of `inka.config.ts`. |
| `configFile` | `'inka.config.ts'` | Config file relative to `cwd`.             |

`resolveProject(options)` returns the resolved paths when you need them in a custom integration.

## Markdown features

- GitHub Flavored Markdown: tables, task lists, strikethrough.
- Shiki highlighting at build time with the `github-light` and `github-dark` themes.
- Heading anchors (`id`) and a table of contents per entry.
- Mermaid diagrams as `<pre class="mermaid">` with lazy client-side rendering.

## Examples

Both example apps render the same blog from the same content folder:

- `examples/next` — Next.js App Router, `generateStaticParams`, `@tailwindcss/postcss`
- `examples/react-router` — React Router v8 framework mode, `prerender`, `@tailwindcss/vite`

Each one has a post list with pagination, tag filters and search, a post page with table of
contents, prev/next links, related posts, JSON-LD and Mermaid diagrams, plus a client-side search
page, `sitemap.xml` and `rss.xml`.

## FAQ

[FAQ.md](FAQ.md) answers the common questions about environment specific `siteUrl` values, running
next to a sitemap your framework already generates, and package manager support.

## Development

```bash
pnpm install
pnpm build            # build the library with tsdown
pnpm test             # run the vitest suite
pnpm lint             # eslint with typescript-eslint strict rules
pnpm format:check     # prettier
pnpm build:examples   # build both example apps
```

### Bundle sizes

`inka/query`, `inka/search` and `inka/mermaid` after `pnpm build`:

| Entry          | Raw    | Gzip   |
| -------------- | ------ | ------ |
| `inka/query`   | 9.1 kB | 2.8 kB |
| `inka/search`  | 0.9 kB | 0.4 kB |
| `inka/mermaid` | 0.7 kB | 0.4 kB |

`inka/query` includes its shared sorting helper. `inka/search` does not include `minisearch`, and
`inka/mermaid` does not include `mermaid`; both are loaded from dependencies at runtime.
