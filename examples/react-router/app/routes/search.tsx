import { useMemo, useState } from 'react'
import { createSearch } from 'inka/search'
import type { SearchIndex } from 'inka/search'
import searchIndex from '#inka/posts.search.json'

export function meta() {
  return [
    { title: 'Search · Inka Blog' },
    { name: 'description', content: 'Instant search over the generated content index.' },
  ]
}

export default function SearchRoute() {
  const [query, setQuery] = useState('')
  const search = useMemo(() => createSearch(searchIndex as SearchIndex), [])
  const hits = query.trim().length > 0 ? search.search(query, { limit: 20 }) : []

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Search</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Instant search in the browser. The index is a JSON file generated at build time.
      </p>

      <input
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
        }}
        placeholder="Search posts"
        className="mt-6 w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />

      <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
        {query.trim().length === 0
          ? 'Type to search.'
          : `${String(hits.length)} ${hits.length === 1 ? 'result' : 'results'}`}
      </p>

      <ul className="mt-4 space-y-3">
        {hits.map((hit) => (
          <li key={hit.id}>
            <a
              href={hit.url}
              className="font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              {typeof hit.title === 'string' ? hit.title : hit.id}
            </a>
            {typeof hit.description === 'string' ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{hit.description}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
