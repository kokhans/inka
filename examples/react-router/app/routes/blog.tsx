import type { LoaderFunctionArgs } from 'react-router'
import { useLoaderData } from 'react-router'
import { posts } from '#inka'
import { Pagination } from '../../components/Pagination'
import { PostCard } from '../../components/PostCard'
import { SearchForm } from '../../components/SearchForm'

const PER_PAGE = 4

export function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const page = Number.parseInt(url.searchParams.get('page') ?? '1', 10)
  const tag = url.searchParams.get('tag') ?? undefined
  const query = url.searchParams.get('q') ?? undefined

  const result = posts.query({
    where: tag ? { tags: { has: tag } } : undefined,
    search: query,
    page: Number.isNaN(page) ? 1 : page,
    perPage: PER_PAGE,
  })

  return { result, tag, query, tags: posts.distinct('tags') }
}

export function meta() {
  return [
    { title: 'Blog · Inka Blog' },
    { name: 'description', content: 'All posts, newest first.' },
  ]
}

export default function BlogRoute() {
  const { result, tag, query, tags } = useLoaderData<typeof loader>()

  const hrefFor = (target: number): string => {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (tag) params.set('tag', tag)
    if (target > 1) params.set('page', String(target))
    const search = params.toString()
    return search ? `/blog?${search}` : '/blog'
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Blog</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        {result.total} {result.total === 1 ? 'post' : 'posts'}
        {tag ? ` tagged “${tag}”` : ''}
        {query ? ` matching “${query}”` : ''}
      </p>

      <div className="mt-6">
        <SearchForm query={query} tag={tag} />
      </div>

      <ul className="mt-4 flex flex-wrap gap-2 text-sm">
        <li>
          <a
            href="/blog"
            className={
              tag
                ? 'rounded-full border border-zinc-300 px-3 py-1 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400'
                : 'rounded-full bg-blue-600 px-3 py-1 text-white'
            }
          >
            all
          </a>
        </li>
        {tags.map((item) => (
          <li key={item.value}>
            <a
              href={`/blog?tag=${encodeURIComponent(item.value)}`}
              className={
                item.value === tag
                  ? 'rounded-full bg-blue-600 px-3 py-1 text-white'
                  : 'rounded-full border border-zinc-300 px-3 py-1 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400'
              }
            >
              {item.value} ({item.count})
            </a>
          </li>
        ))}
      </ul>

      {result.items.length === 0 ? (
        <p className="mt-10 text-zinc-500 dark:text-zinc-400">No posts found.</p>
      ) : (
        <div className="mt-8 space-y-8">
          {result.items.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      )}

      <Pagination page={result.page} totalPages={result.totalPages} hrefFor={hrefFor} />
    </div>
  )
}
