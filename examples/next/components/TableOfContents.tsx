import type { TocEntry } from '../lib/types'

const INDENTS: Record<number, string> = {
  1: 'pl-0',
  2: 'pl-4',
  3: 'pl-8',
  4: 'pl-12',
}

export function TableOfContents({ items }: { items: TocEntry[] }) {
  if (items.length === 0) return null

  return (
    <nav
      className="mt-10 rounded border border-zinc-200 p-4 text-sm dark:border-zinc-800"
      aria-label="Table of contents"
    >
      <p className="font-medium">On this page</p>
      <ul className="mt-2 space-y-1">
        {items.map((item) => (
          <li key={item.id} className={INDENTS[item.depth] ?? 'pl-12'}>
            <a
              href={`#${item.id}`}
              className="text-zinc-600 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400"
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
