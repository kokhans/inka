---
title: Welcome to Inka
description: A small content library that turns Markdown folders into typed collections for React apps.
date: 2026-10-20
tags: [inka, markdown]
cover: /images/layers.svg
---

Inka reads a folder of Markdown files with YAML frontmatter and generates typed
collections, a search index, a sitemap and an RSS feed. Everything happens at
build time, so the app only ships JSON and plain JavaScript.

## What it does

The integration runs `build()` when the dev server starts and on every content
change. The output lives in `.inka/` and looks like this:

```ts
import { posts } from '#inka'

const latest = posts.list()
const page = posts.query({ where: { tags: { has: 'react' } }, page: 2, perPage: 5 })
```

## Why not read files at runtime

Reading `.md` files while the server runs breaks on serverless platforms, where
the source files are not part of the deployment. Generating the content at build
time keeps the deployment simple.

![Layers](/images/layers.svg)

## Drafts

Posts marked with `draft: true` stay visible during development and are removed
from the production output, the sitemap and the RSS feed.
