import type { Element, Root } from 'hast'
import { describe, expect, it, vi } from 'vitest'
import { renderMarkdown } from '../src/markdown.js'

const MERMAID = ['```mermaid', 'flowchart TD', '  A --> B', '```'].join('\n')

describe('renderMarkdown', () => {
  it('renders GFM tables and task lists', async () => {
    const rendered = await renderMarkdown('| a | b |\n|---|---|\n| 1 | 2 |\n\n- [x] done\n')

    expect(rendered.html).toContain('<table>')
    expect(rendered.html).toContain('task-list-item')
    expect(rendered.html).toContain('type="checkbox"')
  })

  it('highlights code blocks at build time', async () => {
    const rendered = await renderMarkdown('```ts\nconst answer = 42\n```\n')

    expect(rendered.html).toContain('class="shiki')
    expect(rendered.html).toContain('--shiki-dark')
    expect(rendered.html).not.toContain('language-ts')
  })

  it('falls back to plain text for unknown languages', async () => {
    const rendered = await renderMarkdown('```unknownlang\nsome text\n```\n')

    expect(rendered.html).toContain('class="shiki')
    expect(rendered.html).toContain('some text')
  })

  it('turns mermaid blocks into pre elements with the diagram source', async () => {
    const rendered = await renderMarkdown(`${MERMAID}\n`)

    expect(rendered.html).toContain('<pre class="mermaid">flowchart TD\n  A --> B</pre>')
    expect(rendered.hasMermaid).toBe(true)
  })

  it('sets hasMermaid to false when there are no diagrams', async () => {
    const rendered = await renderMarkdown('```ts\nconst answer = 42\n```\n')

    expect(rendered.hasMermaid).toBe(false)
  })

  it('collects headings with anchors', async () => {
    const rendered = await renderMarkdown('# One\n\n## Two Words\n\n### Three\n')

    expect(rendered.html).toContain('<h2 id="two-words">')
    expect(rendered.toc).toEqual([
      { depth: 1, text: 'One', id: 'one' },
      { depth: 2, text: 'Two Words', id: 'two-words' },
      { depth: 3, text: 'Three', id: 'three' },
    ])
  })

  it('builds an excerpt from the first paragraph', async () => {
    const rendered = await renderMarkdown('Intro paragraph.\n\nSecond paragraph.\n')

    expect(rendered.excerpt).toBe('Intro paragraph.')
  })

  it('truncates long excerpts', async () => {
    const rendered = await renderMarkdown(`${'word '.repeat(80)}\n`)

    expect(rendered.excerpt.length).toBeLessThanOrEqual(161)
    expect(rendered.excerpt.endsWith('…')).toBe(true)
  })

  it('counts words and reading time', async () => {
    const rendered = await renderMarkdown('one two three four five')

    expect(rendered.wordCount).toBe(5)
    expect(rendered.readingTime).toBe(1)
  })

  it('counts prose only, not code, HTML or Markdown syntax', async () => {
    const code = 'const value = 1\n'.repeat(500)
    const rendered = await renderMarkdown(
      [
        '## Heading words',
        '',
        'Read the [docs](https://example.com/a/very/long/url) and `build()` now.',
        '',
        '- one',
        '- two',
        '',
        '<div class="note">',
        '',
        '```ts',
        code,
        '```',
        '',
        '```mermaid',
        'flowchart TD',
        '  A --> B',
        '```',
      ].join('\n'),
    )

    expect(rendered.wordCount).toBe(10)
    expect(rendered.readingTime).toBe(1)
  })
})

describe('markdown options', () => {
  const python = ['```python', 'def hello():', '    return 1', '```'].join('\n')

  it('highlights any language bundled with Shiki', async () => {
    const rendered = await renderMarkdown(python)

    expect(rendered.html).toContain('shiki')
    expect(rendered.html).toMatch(/<span style="[^"]+">def<\/span>/)
  })

  it('warns once about an unknown language and renders it as text', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const source = ['```not-a-language', 'plain', '```'].join('\n')

    const rendered = await renderMarkdown(source)
    await renderMarkdown(source)

    expect(rendered.html).toContain('plain')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith(
      'loomark: unknown code language "not-a-language", rendered as plain text',
    )
    warn.mockRestore()
  })

  it('does not warn about plain text code blocks', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    await renderMarkdown(['```text', 'plain', '```', '', '```', 'no language', '```'].join('\n'))

    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('uses the configured Shiki themes', async () => {
    const rendered = await renderMarkdown(python, {
      markdown: { shiki: { themes: { light: 'min-light', dark: 'nord' } } },
    })

    expect(rendered.html).toContain('shiki-themes min-light nord')
  })

  it('runs custom remark and rehype plugins', async () => {
    const shout =
      () => (tree: { children: { type: string; children?: { value?: string }[] }[] }) => {
        for (const node of tree.children) {
          for (const child of node.children ?? []) {
            if (typeof child.value === 'string') child.value = child.value.toUpperCase()
          }
        }
      }
    const external = () => (tree: Root) => {
      visitElements(tree, (element) => {
        if (element.tagName === 'a') element.properties['target'] = '_blank'
      })
    }

    const rendered = await renderMarkdown('hello [link](https://example.com)', {
      markdown: { remarkPlugins: [shout], rehypePlugins: [external] },
    })

    expect(rendered.html).toContain('HELLO')
    expect(rendered.html).toContain('target="_blank"')
  })

  it('rewrites image sources through the resolver', async () => {
    const rendered = await renderMarkdown('![Cover](./cover.png) ![Logo](/logo.png)', {
      resolveImage: (src) =>
        Promise.resolve(src.startsWith('./') ? '/assets/cover.png' : undefined),
    })

    expect(rendered.html).toContain('src="/assets/cover.png"')
    expect(rendered.html).toContain('src="/logo.png"')
  })
})

function visitElements(parent: Root | Element, visit: (element: Element) => void): void {
  for (const child of parent.children) {
    if (child.type !== 'element') continue
    visit(child)
    visitElements(child, visit)
  }
}
