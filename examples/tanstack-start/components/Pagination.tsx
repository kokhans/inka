import { AppLink } from './AppLink'

type PaginationProps = {
  page: number
  totalPages: number
  hrefFor: (page: number) => string
}

export function Pagination({ page, totalPages, hrefFor }: PaginationProps) {
  if (totalPages <= 1) return null

  const pages = Array.from({ length: totalPages }, (_value, index) => index + 1)

  return (
    <nav className="mt-8 flex items-center justify-between text-sm" aria-label="Pagination">
      {page > 1 ? (
        <AppLink
          href={hrefFor(page - 1)}
          className="text-blue-600 hover:underline dark:text-blue-400"
        >
          ← Newer
        </AppLink>
      ) : (
        <span className="text-zinc-400 dark:text-zinc-600">← Newer</span>
      )}
      <ul className="flex gap-2">
        {pages.map((item) => (
          <li key={item}>
            <AppLink
              href={hrefFor(item)}
              className={
                item === page
                  ? 'rounded bg-blue-600 px-2.5 py-1 font-medium text-white'
                  : 'rounded px-2.5 py-1 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }
            >
              {item}
            </AppLink>
          </li>
        ))}
      </ul>
      {page < totalPages ? (
        <AppLink
          href={hrefFor(page + 1)}
          className="text-blue-600 hover:underline dark:text-blue-400"
        >
          Older →
        </AppLink>
      ) : (
        <span className="text-zinc-400 dark:text-zinc-600">Older →</span>
      )}
    </nav>
  )
}
