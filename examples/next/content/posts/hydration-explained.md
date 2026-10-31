---
title: Hydration, explained with a sequence diagram
description: What actually happens between the first byte of HTML and the first click.
date: 2026-09-08
tags: [react, ssr]
---

Hydration is the step where React attaches event handlers to the HTML that the
server already sent.

```mermaid
sequenceDiagram
  participant B as Browser
  participant S as Server
  participant R as React
  S->>B: HTML shell
  B->>B: Paint
  B->>R: Load JavaScript
  R->>B: Attach handlers
  B->>R: Click event
  R->>B: Updated DOM
```

## Why it matters

Before hydration finishes, the page is visible but not interactive. Long
hydration tasks block the main thread, so the click feels lost even though the
button is on screen.

- Keep the initial JavaScript small.
- Split work with `startTransition` or a worker.
- Render diagrams and charts on the client only when the page needs them.
