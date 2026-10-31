import { describe, expect, it } from 'vitest'
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
})
