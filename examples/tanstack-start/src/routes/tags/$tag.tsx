import { createFileRoute, notFound } from '@tanstack/react-router'
import { posts } from '#inka'
import { PostCard } from '../../../components/PostCard'

export const Route = createFileRoute('/tags/$tag')({
  loader: ({ params }) => {
    const tagged = posts.query({ where: { tags: { has: params.tag } }, perPage: 50 })
    if (tagged.total === 0) throw notFound()

    return { tag: params.tag, tagged }
  },
  head: ({ params }) => ({
    meta: [
      { title: `Posts tagged ${params.tag} · Inka Blog` },
      { name: 'description', content: `All posts tagged ${params.tag}.` },
    ],
  }),
  component: TagRoute,
})

function TagRoute() {
  const { tag, tagged } = Route.useLoaderData()

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">#{tag}</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        {tagged.total} {tagged.total === 1 ? 'post' : 'posts'}
      </p>
      <div className="mt-8 space-y-8">
        {tagged.items.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>
    </div>
  )
}
