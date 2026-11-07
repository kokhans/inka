# Inka

Inka turns folders of Markdown files with YAML frontmatter into typed, queryable content for
React apps. It works with **Next.js (App Router)**, **React Router v8 (framework mode)** and
**TanStack Start**.

Content is edited by hand in your editor. There is no admin UI, no database and no CLI.

- Everything is generated at build time: JSON data, TypeScript types, a search index,
  `sitemap.xml` and `rss.xml`. No Markdown parsing at runtime, no `import.meta.glob`.
- The app imports typed collections and queries them on the server or in the browser.
- The runtime API ships without dependencies. Markdown, Shiki and the search index are built once.

## Requirements

- Node.js 22 or newer
- ESM only

## Quick Start: Next.js

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

## Quick Start: React Router v8

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

## Quick Start: TanStack Start

`vite.config.ts`:

```ts
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { build } from 'inka'
import { inka } from 'inka/vite'

const { entries } = await build()
const posts = entries['posts'] ?? []

export default defineConfig({
  plugins: [
    inka(),
    tanstackStart({
      prerender: { enabled: true, crawlLinks: false },
      pages: ['/', '/blog', ...posts.map((post) => post.url)].map((path) => ({ path })),
    }),
    viteReact(),
  ],
})
```

The same `inka()` plugin as for React Router builds the content and reloads on changes. Prerendering
is optional; `pages` lists the dynamic routes from the same data.

Load entries in a route `loader` and set the head with `toHead()`:

```tsx
import { createFileRoute, notFound } from '@tanstack/react-router'
import { posts } from '#inka'
import { toHead } from 'inka/seo'

export const Route = createFileRoute('/blog/$slug')({
  loader: ({ params }) => {
    const post = posts.get(params.slug)
    if (!post) throw notFound()
    return { post }
  },
  head: ({ loaderData }) => (loaderData ? toHead(loaderData.post) : {}),
  component: PostPage,
})
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

## Generated Output

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

### Entry Shape

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

### Sorting and Pagination

`sort` overrides the collection sort for a single query. Missing values are sorted last.
`page` is clamped to the available range, so an out-of-range page returns the last page instead
of an empty list. `perPage` defaults to the collection `perPage` and then to `10`.

### Selecting Fields

```ts
const titles = posts.all({ select: ['title', 'slug'] })
const page = posts.query({ select: ['title'], perPage: 5 })
```

### Related Entries

```ts
posts.related('hydration-explained', { by: 'tags', limit: 3 })
```

## Client-Side Search

The search index is a separate JSON file, so it never ends up in the main bundle:

```tsx
import { createSearch } from 'inka/search'
import searchIndex from '#inka/posts.search.json'

const search = createSearch(searchIndex)
const hits = search.search('hydration', { limit: 10 })
```

Every hit contains `id`, `url`, `score` and the stored search fields.

## Mermaid Diagrams

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

## Code Block Styling

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

## SEO Helpers

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

```ts
import { toHead } from 'inka/seo'

export const Route = createFileRoute('/blog/$slug')({
  head: ({ loaderData }) => (loaderData ? toHead(loaderData.post) : {}),
})
```

- `toMetadata(entry)` returns a Next.js `Metadata` object.
- `toMeta(entry)` returns React Router meta descriptors.
- `toHead(entry)` returns TanStack Router `head()` options: meta tags, a canonical link and the
  JSON-LD script.
- `jsonLd(entry)` returns a schema.org `BlogPosting` object.

All of them use the same field mapper, so title, description, canonical URL and dates stay
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

## Markdown Features

- GitHub Flavored Markdown: tables, task lists, strikethrough.
- Shiki highlighting at build time with the `github-light` and `github-dark` themes.
- Heading anchors (`id`) and a table of contents per entry.
- Mermaid diagrams as `<pre class="mermaid">` with lazy client-side rendering.

## Bundle Sizes

Runtime entries shipped to the browser:

| Entry          | Raw    | Gzip   |
| -------------- | ------ | ------ |
| `inka/query`   | 9.1 kB | 2.8 kB |
| `inka/search`  | 0.9 kB | 0.4 kB |
| `inka/mermaid` | 0.7 kB | 0.4 kB |

`inka/query` includes its shared sorting helper. `inka/search` does not include `minisearch`, and
`inka/mermaid` does not include `mermaid`; both are loaded from dependencies at runtime.

## FAQ

### What Is `siteUrl` Used For?

`siteUrl` is only used to generate the two feeds. It affects nothing else.

- Sitemap `<loc>` values: `joinUrl(siteUrl, entry.url)`, so `/blog/hello` becomes
  `https://myblog.dev/blog/hello`.
- RSS item `<link>` and `<guid>`: the same absolute URL.
- RSS channel `<link>`: `siteUrl` as written.

It does not affect:

- `entry.url`. That stays whatever your `url(entry)` returns, normally a relative path.
- The SEO helpers. `toMetadata()`, `toMeta()` and `jsonLd()` use `entry.url` as the canonical URL,
  so `alternates.canonical` and `og:url` are relative unless your `url()` returns absolute URLs.
  In Next.js, set `metadataBase` in the root layout to make them absolute.
- Anything else. When `siteUrl` is missing, neither `sitemap.xml` nor `rss.xml` is written.

`rss.xml` is additionally skipped when no collection opts in with `rss: true`.

### How Do I Use a Different URL in Development, Staging and Production?

`inka.config.ts` is plain TypeScript evaluated by Node at build time, so `process.env` works
normally.

```ts
import { collection, defineConfig, z } from 'inka'

const siteUrl = process.env.SITE_URL

export default defineConfig({
  ...(siteUrl ? { siteUrl } : {}),
  collections: {
    posts: collection({
      folder: 'posts',
      schema: z.object({ title: z.string(), date: z.coerce.date() }),
      url: (entry) => `/blog/${entry.slug}`,
      rss: true,
    }),
  },
})
```

Pick the shape that matches your setup. Localhost in development, a real URL everywhere else:

```ts
const siteUrl =
  process.env.SITE_URL ??
  (process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:3000')
```

One default per environment:

```ts
const defaults = {
  development: 'http://localhost:3000',
  staging: 'https://staging.myblog.dev',
  production: 'https://myblog.dev',
} as const
const appEnv = process.env.APP_ENV as keyof typeof defaults | undefined
const siteUrl = process.env.SITE_URL ?? (appEnv ? defaults[appEnv] : undefined)
```

Or omit `siteUrl` in development entirely, so no feeds are generated locally.

Keep in mind:

- The URL is baked into the generated files at build time. Building each environment separately
  is fine; promoting one staging artifact to production would ship staging URLs.
- The library does not load `.env` files. Environment variables from your shell or CI always work.
  Next.js loads `.env*` before it evaluates `next.config.ts`, which is where `withInka` runs
  `build()`; the Vite config (React Router, TanStack Start) is evaluated in Node, so use real environment
  variables there.
- If the URL is only known at deploy time, leave `siteUrl` out and call `build()` from your own
  script with an overriding config:

```ts
import { build } from 'inka'
import config from './inka.config'

const siteUrl = process.env.SITE_URL
await build({ config: siteUrl ? { ...config, siteUrl } : config })
```

### How Does `sitemap.xml` Work Next to the Sitemap My Framework Generates?

Inka writes a file, it does not merge with or reference anything else:

- `.inka/sitemap.xml`, always written when `siteUrl` is set.
- `public/sitemap.xml`, a copy of the same file, written when `publicDir` is configured.

So if you already have `app/sitemap.ts` in Next.js or a `/sitemap.xml` route in React Router or TanStack Start, you
have two producers for the same URL. Which one answers the request depends on the framework
(Next.js resolves app routes before `public/`, `react-router-serve` serves static files first), so
do not rely on that order. Pick one owner.

**Your sitemap stays the owner.** Use the collections as data and add Inka entries to the sitemap
you already have:

```ts
import type { MetadataRoute } from 'next'
import { posts } from '#inka'

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ['/', '/blog', '/about'].map((path) => ({ url: `https://myblog.dev${path}` }))
  const articles = posts.all().map((post) => ({
    url: `https://myblog.dev${post.url}`,
    lastModified: post.updated ?? post.date,
  }))

  return [...pages, ...articles]
}
```

In React Router and TanStack Start the same data goes into a server route that returns the XML.

**Inka stays the owner.** Drop your own generator and keep `publicDir: 'public'`. Be aware that
the generated sitemap only contains collection entries, so your home page, the blog index and the
tag pages are not in it.

**Sitemap index.** Search engines accept an index that references several sitemaps, but Inka
always uses the name `sitemap.xml` and does not generate an index, so you would have to move or
rename the generated file in a post-build step.

Related limitations:

- There is no switch that disables only the sitemap. `sitemap: false` is per collection and an
  empty `<urlset>` is still written; the only off-switch is omitting `siteUrl`, which also
  disables the feeds.
- The XML renderers are internal, so merging both sources into one file means writing the XML
  yourself.
- A collection appears in the sitemap unless it sets `sitemap: false`, and in the RSS feed only
  when it sets `rss: true`.
- `public/sitemap.xml` and `public/rss.xml` are build artifacts. Keep them in `.gitignore`.

### Which Package Managers Are Supported?

`pnpm add inka` is just pnpm syntax. The package is a normal registry package and works with any
manager:

- **pnpm**: `pnpm add inka`
- **npm**: `npm install inka`
- **Yarn** (classic or berry): `yarn add inka`
- **Bun**: `bun add inka`
- **Deno**: `deno add npm:inka`

What the package expects, independent of the manager:

- ESM only. `"type": "module"`, and the `exports` map exposes `types`, `import` and `default`
  conditions but no `require`, so `require('inka')` is not supported.
- No postinstall scripts and no native modules, `"sideEffects": false`, `"engines": { "node": ">=22" }`.
- `mermaid` is an optional peer dependency. Install it with the same manager when you use
  `inka/mermaid`.
- The `#inka` alias relies on the `imports` field in your `package.json`, which every manager
  writes identically; the resolver (Next.js, Vite, Node) does the rest.
