import { readField } from './shared/values.js'
import type { Entry, RuntimeCollection } from './types.js'

export type SearchDocument = {
  id: string
  url: string
  [field: string]: unknown
}

export type SearchIndex = {
  fields: string[]
  boost: Record<string, number>
  documents: SearchDocument[]
}

export function createSearchIndex(definition: RuntimeCollection, entries: Entry[]): SearchIndex {
  const fields = definition.search?.fields ?? []

  return {
    fields,
    boost: definition.search?.boost ?? {},
    documents: entries.map((entry) => {
      const document: SearchDocument = { id: entry.slug, url: entry.url }
      for (const field of fields) {
        document[field] = readField(entry, field)
      }
      return document
    }),
  }
}
