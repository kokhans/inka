import { describe, expect, it } from 'vitest'
import { createCollection } from '../src/query/index.js'
import { makeEntry } from './helpers.js'

const entries = [
  makeEntry({
    slug: 'first',
    title: 'First post',
    date: new Date('2026-01-01'),
    views: 10,
    tags: ['react', 'typescript'],
    draft: false,
  }),
  makeEntry({
    slug: 'second',
    title: 'Second post',
    date: new Date('2026-02-01'),
    views: 25,
    tags: ['react'],
    draft: true,
  }),
  makeEntry({
    slug: 'third',
    title: 'Third post about hydration',
    date: new Date('2026-03-01'),
    views: 5,
    tags: ['vue', 'ssr'],
    draft: false,
  }),
]

const posts = createCollection(entries, { name: 'posts', sort: { date: 'desc' } })

describe('collection basics', () => {
  it('returns entries sorted by the collection sort', () => {
    expect(posts.all().map((entry) => entry.slug)).toEqual(['third', 'second', 'first'])
  })

  it('finds an entry by slug', () => {
    expect(posts.get('second')?.title).toBe('Second post')
    expect(posts.get('missing')).toBeUndefined()
  })

  it('removes html and body from list items', () => {
    const [item] = posts.list()

    expect(item).not.toHaveProperty('html')
    expect(item).not.toHaveProperty('body')
    expect(item.slug).toBe('third')
  })

  it('keeps only the selected fields', () => {
    const [item] = posts.all({ select: ['title', 'slug'] })

    expect(Object.keys(item).sort()).toEqual(['slug', 'title'])
  })
})

describe('where operators', () => {
  it('matches plain values as equals', () => {
    expect(posts.query({ where: { draft: true } }).total).toBe(1)
  })

  it('matches with equals', () => {
    expect(posts.query({ where: { title: { equals: 'First post' } } }).total).toBe(1)
  })

  it('matches with in', () => {
    expect(posts.query({ where: { slug: { in: ['first', 'third'] } } }).total).toBe(2)
  })

  it('matches arrays with has', () => {
    expect(posts.query({ where: { tags: { has: 'react' } } }).total).toBe(2)
    expect(posts.query({ where: { tags: { has: 'svelte' } } }).total).toBe(0)
  })

  it('matches arrays with hasSome', () => {
    expect(posts.query({ where: { tags: { hasSome: ['vue', 'react'] } } }).total).toBe(3)
  })

  it('matches arrays with hasEvery', () => {
    expect(posts.query({ where: { tags: { hasEvery: ['react', 'typescript'] } } }).total).toBe(1)
  })

  it('compares numbers', () => {
    expect(posts.query({ where: { views: { gt: 10 } } }).total).toBe(1)
    expect(posts.query({ where: { views: { gte: 10 } } }).total).toBe(2)
    expect(posts.query({ where: { views: { lt: 10 } } }).total).toBe(1)
    expect(posts.query({ where: { views: { lte: 10 } } }).total).toBe(2)
  })

  it('compares dates', () => {
    const result = posts.query({ where: { date: { gte: new Date('2026-02-01') } } })

    expect(result.items.map((entry) => entry.slug)).toEqual(['third', 'second'])
  })

  it('ignores missing values in range operators', () => {
    expect(posts.query({ where: { date: { gt: new Date('2026-01-01') } } }).total).toBe(2)
  })

  it('matches substrings with contains, ignoring case', () => {
    expect(posts.query({ where: { title: { contains: 'HYDRATION' } } }).total).toBe(1)
  })

  it('negates with not', () => {
    expect(posts.query({ where: { draft: { not: true } } }).total).toBe(2)
    expect(posts.query({ where: { title: { not: { contains: 'post' } } } }).total).toBe(0)
  })

  it('combines fields with and', () => {
    expect(posts.query({ where: { draft: false, tags: { has: 'react' } } }).total).toBe(1)
  })

  it('returns everything for an empty where', () => {
    expect(posts.query({ where: {} }).total).toBe(3)
  })
})

describe('sort', () => {
  it('sorts ascending by an override', () => {
    expect(posts.query({ sort: { date: 'asc' } }).items.map((entry) => entry.slug)).toEqual([
      'first',
      'second',
      'third',
    ])
  })

  it('sorts by multiple fields', () => {
    const result = posts.query({ sort: { draft: 'asc', views: 'desc' } })

    expect(result.items.map((entry) => entry.slug)).toEqual(['first', 'third', 'second'])
  })

  it('keeps missing values last', () => {
    const collection = createCollection(
      [
        makeEntry({ slug: 'a', rank: 2 }),
        makeEntry({ slug: 'b' }),
        makeEntry({ slug: 'c', rank: 1 }),
      ],
      { name: 'items', sort: { rank: 'asc' } },
    )

    expect(collection.all().map((entry) => entry.slug)).toEqual(['c', 'a', 'b'])
  })
})

describe('pagination', () => {
  it('paginates with defaults', () => {
    const result = posts.query({ perPage: 2 })

    expect(result.items).toHaveLength(2)
    expect(result).toMatchObject({
      total: 3,
      page: 1,
      perPage: 2,
      totalPages: 2,
      hasNext: true,
      hasPrev: false,
    })
  })

  it('returns the last page', () => {
    const result = posts.query({ perPage: 2, page: 2 })

    expect(result.items.map((entry) => entry.slug)).toEqual(['first'])
    expect(result.hasNext).toBe(false)
    expect(result.hasPrev).toBe(true)
  })

  it('clamps an out of range page to the last page', () => {
    const result = posts.query({ perPage: 2, page: 99 })

    expect(result.page).toBe(2)
    expect(result.items).toHaveLength(1)
  })

  it('clamps a page below one', () => {
    expect(posts.query({ page: 0 }).page).toBe(1)
  })

  it('handles an empty collection', () => {
    const empty = createCollection([], { name: 'empty' })
    const result = empty.query()

    expect(result).toEqual({
      items: [],
      total: 0,
      perPage: 10,
      page: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    })
  })
})

describe('search', () => {
  const searchable = createCollection(entries, {
    name: 'posts',
    search: { fields: ['title', 'tags'], boost: { title: 3 } },
  })

  it('finds entries by term', () => {
    expect(searchable.query({ search: 'hydration' }).items.map((entry) => entry.slug)).toEqual([
      'third',
    ])
  })

  it('requires every term to match', () => {
    expect(searchable.query({ search: 'post hydration' }).total).toBe(1)
    expect(searchable.query({ search: 'hydration vue' }).total).toBe(1)
    expect(searchable.query({ search: 'hydration angular' }).total).toBe(0)
  })

  it('searches array fields', () => {
    expect(searchable.query({ search: 'typescript' }).total).toBe(1)
  })

  it('returns nothing for an empty query', () => {
    expect(searchable.query({ search: '   ' }).total).toBe(3)
  })
})

describe('distinct', () => {
  it('counts values and sorts by count', () => {
    expect(posts.distinct('tags')).toEqual([
      { value: 'react', count: 2 },
      { value: 'ssr', count: 1 },
      { value: 'typescript', count: 1 },
      { value: 'vue', count: 1 },
    ])
  })

  it('counts scalar values', () => {
    expect(posts.distinct('draft')).toEqual([
      { value: 'false', count: 2 },
      { value: 'true', count: 1 },
    ])
  })
})

describe('adjacent', () => {
  it('uses the collection sort', () => {
    const result = posts.adjacent('second')

    expect(result.prev?.slug).toBe('third')
    expect(result.next?.slug).toBe('first')
  })

  it('returns undefined at the edges', () => {
    expect(posts.adjacent('third')).toEqual({ prev: undefined, next: posts.get('second') })
    expect(posts.adjacent('missing')).toEqual({ prev: undefined, next: undefined })
  })
})

describe('related', () => {
  const collection = createCollection(
    [
      makeEntry({ slug: 'a', tags: ['x', 'y', 'z'] }),
      makeEntry({ slug: 'b', tags: ['x', 'y'] }),
      makeEntry({ slug: 'c', tags: ['x'] }),
      makeEntry({ slug: 'd', tags: ['q'] }),
    ],
    { name: 'posts' },
  )

  it('finds entries sharing tags, most shared first', () => {
    expect(collection.related('a', { by: 'tags' }).map((entry) => entry.slug)).toEqual(['b', 'c'])
  })

  it('respects the limit', () => {
    expect(collection.related('a', { limit: 1 }).map((entry) => entry.slug)).toEqual(['b'])
  })

  it('returns nothing for unknown slugs', () => {
    expect(posts.related('missing')).toEqual([])
  })
})

describe('date revival', () => {
  it('turns stored date strings into dates', () => {
    const collection = createCollection([{ ...makeEntry({ slug: 'a' }), date: '2026-01-15' }], {
      name: 'posts',
      dates: ['date'],
    })

    expect(collection.get('a')?.['date']).toBeInstanceOf(Date)
  })
})
