import type { LoaderFunctionArgs, MetaFunction } from 'react-router'
import { useLoaderData } from 'react-router'
import { posts } from '#inka'
import { PostCard } from '../../components/PostCard'

export function loader({ params }: LoaderFunctionArgs) {
  const tag = params.tag ?? ''
  const tagged = posts.query({ where: { tags: { has: tag } }, perPage: 50 })
  if (tagged.total === 0) throw new Response('Not found', { status: 404 })

  return { tag, tagged }
}

export const meta: MetaFunction<typeof loader> = ({ loaderData }) => {
  const tag = loaderData?.tag ?? 'tag'

  return [
    { title: `Posts tagged ${tag} · Inka Blog` },
    { name: 'description', content: `All posts tagged ${tag}.` },
  ]
}

export default function TagRoute() {
  const { tag, tagged } = useLoaderData<typeof loader>()

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
