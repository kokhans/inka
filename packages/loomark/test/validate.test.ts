import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { formatError, validateFrontmatter } from '../src/validate.js'

const schema = z.object({
  title: z.string(),
  date: z.coerce.date(),
  tags: z.array(z.string()).default([]),
})

describe('validateFrontmatter', () => {
  it('returns parsed data for valid frontmatter', () => {
    const result = validateFrontmatter({
      schema,
      data: { title: 'Hello', date: '2026-01-15' },
      file: 'content/posts/hello.md',
      collection: 'posts',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data['title']).toBe('Hello')
    expect(result.data['date']).toBeInstanceOf(Date)
    expect(result.data['tags']).toEqual([])
  })

  it('reports the file, the field and the reason', () => {
    const result = validateFrontmatter({
      schema,
      data: { title: 'Hello', date: 'yesterday' },
      file: 'content/posts/hello.md',
      collection: 'posts',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors).toHaveLength(1)
    expect(formatError(result.errors[0])).toBe(
      'content/posts/hello.md: "date" — Expected date, received "yesterday"',
    )
  })

  it('reports missing fields', () => {
    const result = validateFrontmatter({
      schema,
      data: { date: '2026-01-15' },
      file: 'content/posts/hello.md',
      collection: 'posts',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0].field).toBe('title')
    expect(formatError(result.errors[0])).toBe(
      'content/posts/hello.md: "title" — Expected string, received undefined',
    )
  })

  it('describes non-string values by their type', () => {
    const result = validateFrontmatter({
      schema,
      data: { title: 42, date: '2026-01-15' },
      file: 'content/posts/hello.md',
      collection: 'posts',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0].message).toBe('Expected string, received number')
  })

  it('keeps nested field paths', () => {
    const result = validateFrontmatter({
      schema: z.object({ author: z.object({ name: z.string() }) }),
      data: { author: { name: 1 } },
      file: 'content/posts/hello.md',
      collection: 'posts',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0].field).toBe('author.name')
  })
})
