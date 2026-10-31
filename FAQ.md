# FAQ

## What is `siteUrl` used for?

`siteUrl` is read in one place only: `renderFeeds()` in `packages/inka/src/build.ts`. It affects
the two generated feeds and nothing else.

- Sitemap `<loc>` values: `joinUrl(siteUrl, entry.url)`, so `/blog/hello` becomes
  `https://myblog.dev/blog/hello`.
- RSS item `<link>` and `<guid>`: the same absolute URL.
- RSS channel `<link>`: `siteUrl` as written.

It does not affect:

- `entry.url`. That stays whatever your `url(entry)` returns, normally a relative path.
- The SEO helpers. `toMetadata()`, `toMeta()` and `jsonLd()` use `entry.url` as the canonical URL,
  so `alternates.canonical` and `og:url` are relative unless your `url()` returns absolute URLs.
  The Next.js example leaves them relative and fixes them with `metadataBase` in the root layout.
- Anything else. When `siteUrl` is missing, `renderFeeds()` returns nothing and neither
  `sitemap.xml` nor `rss.xml` is written.

`rss.xml` is additionally skipped when no collection opts in with `rss: true`.

## How do I use a different URL in development, staging and production?

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
  `build()`; the Vite and React Router config is evaluated in Node, so use real environment
  variables there.
- If the URL is only known at deploy time, leave `siteUrl` out and call `build()` from your own
  script with an overriding config:

```ts
import { build } from 'inka'
import config from './inka.config'

const siteUrl = process.env.SITE_URL
await build({ config: siteUrl ? { ...config, siteUrl } : config })
```

## How does `sitemap.xml` work next to the sitemap my framework generates?

Inka writes a file, it does not merge with or reference anything else:

- `.inka/sitemap.xml`, always written when `siteUrl` is set.
- `public/sitemap.xml`, a copy of the same file, written when `publicDir` is configured.

So if you already have `app/sitemap.ts` in Next.js or a `/sitemap.xml` route in React Router, you
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

In React Router the same data goes into a resource route that returns the XML.

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
- `renderSitemap()` and `renderRss()` are internal, so merging both sources into one file means
  writing the XML yourself.
- A collection appears in the sitemap unless it sets `sitemap: false`, and in the RSS feed only
  when it sets `rss: true`.
- `public/sitemap.xml` and `public/rss.xml` are build artifacts. Keep them in `.gitignore`; both
  example apps do.

## Which package managers are supported?

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

Only this monorepo is pnpm specific (`pnpm-workspace.yaml` and the `workspace:*` protocol in the
examples). Published consumers never see that.
