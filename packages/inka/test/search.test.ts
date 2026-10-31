import { describe, expect, it } from 'vitest'
import { createSearch } from '../src/search/index.js'
import type { SearchIndex } from '../src/search-index.js'

const index: SearchIndex = {
  fields: ['title', 'body'],
  boost: { title: 3 },
  documents: [
    {
      id: 'hydration',
      url: '/blog/hydration',
      title: 'Hydration in React',
      body: 'Why hydration matters',
    },
    {
      id: 'streaming',
      url: '/blog/streaming',
      title: 'Streaming',
      body: 'Server rendering and hydration',
    },
    { id: 'vite', url: '/blog/vite', title: 'Vite', body: 'A build tool' },
  ],
}

describe('createSearch', () => {
  it('finds documents by term', () => {
    const search = createSearch(index)
    const hits = search.search('hydration')

    expect(hits.map((hit) => hit.id)).toEqual(['hydration', 'streaming'])
  })

  it('returns the url and stored fields', () => {
    const search = createSearch(index)
    const [hit] = search.search('vite')

    expect(hit.url).toBe('/blog/vite')
    expect(hit.title).toBe('Vite')
    expect(typeof hit.score).toBe('number')
  })

  it('boosts title matches', () => {
    const search = createSearch(index)
    const [first] = search.search('hydration')

    expect(first.id).toBe('hydration')
  })

  it('returns no hits for unknown terms', () => {
    const search = createSearch(index)

    expect(search.search('kubernetes')).toEqual([])
  })

  it('limits the number of hits', () => {
    const search = createSearch(index)

    expect(search.search('hydration', { limit: 1 })).toHaveLength(1)
  })
})
