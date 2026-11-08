# Loomark

Loomark is a build-time Markdown content library for React apps. This repository holds the library,
its tests and example apps.

Usage documentation lives in the package README: [packages/loomark/README.md](packages/loomark/README.md).

## Repository Layout

- `packages/loomark`: the published `loomark` package. Source in `src/`, tests in `test/`. Type
  tests live in `test/*.test-d.ts`.
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
pnpm test             # run the vitest suite, including type tests
pnpm lint             # eslint with typescript-eslint strict rules
pnpm format:check     # prettier
pnpm build:examples   # build all example apps
```

`pnpm build` runs two tsdown builds into `dist/`: the build-time entries (`loomark`, `loomark/next`,
`loomark/vite` and the `loomark` CLI in `src/cli`) for Node, and the runtime entries (`loomark/query`, `loomark/search`,
`loomark/mermaid`, `loomark/seo`) for a neutral platform, because they ship to the browser. Keep
Node APIs and build-time dependencies out of the runtime entries.

`pnpm test` also type checks `test/*.test-d.ts` through Vitest typecheck mode, so a type regression
fails the suite like any other test.

pnpm links the `loomark` binary into the examples at install time, so after the first `pnpm build`
run `pnpm install` once to use `pnpm exec loomark` there.

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

## Publishing

`prepublishOnly` builds the library, so `npm publish` never ships a stale `dist/`. npm only packs
files from `packages/loomark`, so `packages/loomark/LICENSE` is a copy of the root `LICENSE`. Keep
both in sync.
