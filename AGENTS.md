# Agents

Loomark is a build-time Markdown content library for React apps (Next.js App Router, React Router v8
and TanStack Start). It turns Markdown files with YAML frontmatter into typed JSON collections, a
search index, `sitemap.xml` and `rss.xml` inside `.loomark/`.

## Layout

- `packages/loomark`: the library. Source in `src/`, tests in `test/`.
- `src/build.ts`: entry point of the build pipeline.
- `src/query`, `src/search`, `src/mermaid`, `src/seo`: runtime entries, shipped to the browser.
- `src/next`, `src/vite`: framework integrations.
- `examples/next`, `examples/react-router`, `examples/tanstack-start`: example apps rendering the
  same content.

## Commands

```bash
pnpm install
pnpm build            # build the library
pnpm test             # run vitest
pnpm lint             # eslint
pnpm format:check     # prettier
pnpm build:examples   # build all example apps
```

## Rules

- Node 22+, ESM only, pnpm workspace.
- Keep runtime entries small and free of build-time dependencies.
- Prettier style: no semicolons, single quotes, 100 character lines.
- Add or update tests in `packages/loomark/test` for behavior changes.
- Usage docs live in `packages/loomark/README.md`, development docs in the root `README.md`.
- Keep `packages/loomark/README.md` in sync with public API changes.

## Markdown Conventions

- Never use double dashes (`--` or `—`) in prose.
- Headers and subheaders use Title Case.
