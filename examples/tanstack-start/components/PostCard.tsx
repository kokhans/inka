import type { PostSummary } from '../lib/types'
import { formatDate } from '../lib/format'
import { AppLink } from './AppLink'
import { TagList } from './TagList'

export function PostCard({ post }: { post: PostSummary }) {
  return (
    <article className="border-b border-zinc-200 pb-6 dark:border-zinc-800">
      <h2 className="text-xl font-semibold tracking-tight">
        <AppLink href={post.url} className="hover:text-blue-600 dark:hover:text-blue-400">
          {post.title}
        </AppLink>
      </h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        <time dateTime={post.date.toISOString()}>{formatDate(post.date)}</time>
        {' · '}
        {post.readingTime} min read
      </p>
      <p className="mt-3 text-zinc-700 dark:text-zinc-300">{post.description}</p>
      <TagList tags={post.tags} />
    </article>
  )
}
