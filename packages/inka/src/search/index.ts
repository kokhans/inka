import MiniSearch from 'minisearch'
import type { SearchIndex } from '../search-index.js'

export type { SearchDocument, SearchIndex } from '../search-index.js'

export type SearchHit = {
  id: string
  url: string
  score: number
  [field: string]: unknown
}

export type SearchOptions = {
  limit?: number
}

export type Search = {
  search(query: string, options?: SearchOptions): SearchHit[]
}

export function createSearch(index: SearchIndex): Search {
  const miniSearch = new MiniSearch({
    fields: index.fields,
    storeFields: [...new Set(['url', ...index.fields])],
    searchOptions: { boost: index.boost },
  })
  miniSearch.addAll(index.documents)

  return {
    search(query: string, options: SearchOptions = {}): SearchHit[] {
      const results = miniSearch.search(query)
      const hits = (results as unknown as Record<string, unknown>[]).map(toHit)
      return options.limit ? hits.slice(0, options.limit) : hits
    },
  }
}

function toHit(result: Record<string, unknown>): SearchHit {
  return {
    ...result,
    id: readId(result['id']),
    url: readString(result['url']),
    score: Number(result['score']),
  }
}

function readId(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return ''
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}
