# Inka

Inka is a build-time Markdown content library for React apps. This repository holds the library,
its tests and example apps.

Usage documentation lives in the package README: [packages/inka/README.md](packages/inka/README.md).

## Repository Layout

- `packages/inka`: the published `inka` package. Source in `src/`, tests in `test/`.
- `examples/next`: Next.js App Router example.
- `examples/react-router`: React Router v8 framework mode example.
- `examples/tanstack-start`: TanStack Start example.

## Requirements

- Node.js 22 or newer
- pnpm (version pinned in `packageManager` of the root `package.json`)

## Development

```bash
pnpm install
pnpm build            # build the library with tsdown
pnpm test             # run the vitest suite
pnpm lint             # eslint with typescript-eslint strict rules
pnpm format:check     # prettier
pnpm build:examples   # build all example apps
```

The monorepo is pnpm specific (`pnpm-workspace.yaml` and the `workspace:*` protocol in the
examples). The published package works with any package manager.

## Examples

All example apps render the same blog from the same content folder:

- `examples/next`: Next.js App Router, `generateStaticParams`, `@tailwindcss/postcss`
- `examples/react-router`: React Router v8 framework mode, `prerender`, `@tailwindcss/vite`
- `examples/tanstack-start`: TanStack Start with file routes, `prerender`, `@tailwindcss/vite`

Each one has a post list with pagination, tag filters and search, a post page with table of
contents, prev/next links, related posts, JSON-LD and Mermaid diagrams, plus a client-side search
page, `sitemap.xml` and `rss.xml`.
