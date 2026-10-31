---
title: Tailwind CSS 4 with the default theme
description: A CSS first setup without a config file and without custom design tokens.
date: 2026-08-25
tags: [css, tailwind]
---

Tailwind CSS 4 is configured in CSS. One import pulls in the framework and one
plugin adds typography styles for rendered Markdown.

```css
@import 'tailwindcss';
@plugin '@tailwindcss/typography';
```

## Keep the defaults

Sticking to the default palette and spacing makes the markup predictable. A post
page only needs a centered container and the `prose` classes:

```html
<article class="prose max-w-none dark:prose-invert">
  <!-- rendered Markdown -->
</article>
```

Dark mode needs no configuration either. The `dark:` variant follows the
operating system setting by default.
