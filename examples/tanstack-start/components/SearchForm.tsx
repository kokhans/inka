type SearchFormProps = {
  query: string | undefined
  tag: string | undefined
}

export function SearchForm({ query, tag }: SearchFormProps) {
  return (
    <form action="/blog" method="get" className="flex gap-2">
      {tag ? <input type="hidden" name="tag" value={tag} /> : null}
      <input
        type="search"
        name="q"
        defaultValue={query}
        placeholder="Search posts"
        className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <button
        type="submit"
        className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Search
      </button>
    </form>
  )
}
