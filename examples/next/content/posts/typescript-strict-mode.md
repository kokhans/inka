---
title: Strict TypeScript without any
description: A few habits that make strict mode pleasant instead of loud.
date: 2026-08-11
tags: [typescript, tooling]
---

Strict mode is only painful when values arrive from the outside world. Keep the
untyped boundary small and convert the values once.

```ts
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
```

## Narrow, do not cast

A type guard keeps the compiler informed and costs nothing at runtime. Casts
silence the compiler and move the mistake to runtime, where it is harder to find.

- Prefer `unknown` over `any` at every boundary.
- Return explicit types on public functions.
- Let the compiler infer the rest.
