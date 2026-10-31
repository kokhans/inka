import { describe, expect, it } from 'vitest'
import { parseFrontmatter } from '../src/frontmatter.js'

describe('parseFrontmatter', () => {
  it('parses YAML frontmatter and keeps the body', () => {
    const result = parseFrontmatter('---\ntitle: Hello\ntags:\n  - react\n---\n\nBody text\n')

    expect(result.data).toEqual({ title: 'Hello', tags: ['react'] })
    expect(result.body).toBe('\nBody text\n')
  })

  it('returns the whole source when there is no frontmatter', () => {
    const result = parseFrontmatter('# Just markdown')

    expect(result.data).toEqual({})
    expect(result.body).toBe('# Just markdown')
  })

  it('handles Windows line endings', () => {
    const result = parseFrontmatter('---\r\ntitle: Hello\r\n---\r\nBody')

    expect(result.data).toEqual({ title: 'Hello' })
    expect(result.body).toBe('Body')
  })

  it('returns an empty object for empty frontmatter', () => {
    const result = parseFrontmatter('---\n---\nBody')

    expect(result.data).toEqual({})
    expect(result.body).toBe('Body')
  })

  it('throws for invalid YAML', () => {
    expect(() => parseFrontmatter('---\ntitle: [unclosed\n---\nBody')).toThrow()
  })

  it('throws when the frontmatter is not a mapping', () => {
    expect(() => parseFrontmatter('---\n- one\n- two\n---\nBody')).toThrow(
      'Expected the frontmatter to be a YAML mapping',
    )
  })
})
