import { createFileRoute, notFound } from '@tanstack/react-router'
import { posts } from '#loomark'
import { toHead } from 'loomark/seo'
import { AppLink } from '../../../components/AppLink'
import { ArticleContent } from '../../../components/ArticleContent'
import { TableOfContents } from '../../../components/TableOfContents'
import { TagList } from '../../../components/TagList'
import { formatDate } from '../../../lib/format'

export const Route = createFileRoute('/blog/$slug')({
  loader: ({ params }) => {
    const post = posts.get(params.slug)
    if (!post) throw notFound()

    return {
      post,
      ...posts.adjacent(params.slug),
      related: posts.related(params.slug, { by: 'tags', limit: 3 }),
    }
  },
  head: ({ loaderData }) =>
    loaderData ? toHead(loaderData.post) : { meta: [{ title: 'Post not found' }] },
  component: PostRoute,
})

function PostRoute() {
  const { post, prev, next, related } = Route.useLoaderData()

  return (
    <article>
      <header>
        <h1 className="text-3xl font-bold tracking-tight">{post.title}</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          <time dateTime={post.date.toISOString()}>{formatDate(post.date)}</time>
          {' · '}
          {post.readingTime} min read
        </p>
        <TagList tags={post.tags} />
      </header>

      <ArticleContent html={post.html} hasMermaid={post.hasMermaid} />
      <TableOfContents items={post.toc} />

      <nav className="mt-10 flex justify-between border-t border-zinc-200 pt-6 text-sm dark:border-zinc-800">
        {prev ? (
          <AppLink href={prev.url} className="text-blue-600 hover:underline dark:text-blue-400">
            ← {prev.title}
          </AppLink>
        ) : (
          <span />
        )}
        {next ? (
          <AppLink href={next.url} className="text-blue-600 hover:underline dark:text-blue-400">
            {next.title} →
          </AppLink>
        ) : (
          <span />
        )}
      </nav>

      {related.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Related posts</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {related.map((item) => (
              <li key={item.slug}>
                <AppLink
                  href={item.url}
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  {item.title}
                </AppLink>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  )
}
