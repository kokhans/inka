---
title: Streaming with React 19
description: Suspense boundaries make it easy to send the shell early and stream the slow parts.
date: 2026-09-22
tags: [react, ssr]
---

The shell of a page is usually cheap to render. The expensive parts are the
queries that need a database or a third party API.

```tsx
import { Suspense } from 'react'

export function Page() {
  return (
    <main>
      <Header />
      <Suspense fallback={<Skeleton />}>
        <SlowList />
      </Suspense>
    </main>
  )
}
```

React sends the `<main>` element as soon as it is ready and streams the
`<SlowList>` markup once the promise resolves. Nothing special is needed on the
server: the framework splits the stream for you.

## Where the boundary belongs

Put the boundary close to the data, not around the whole page. A page level
boundary only delays the fallback and hides the parts that were ready long ago.
