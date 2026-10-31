import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { posts } from '#inka'
import { PostCard } from '../../../components/PostCard'

type TagParams = {
  tag: string
}

export function generateStaticParams(): TagParams[] {
  return posts.distinct('tags').map((item) => ({ tag: item.value }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<TagParams>
}): Promise<Metadata> {
  const { tag } = await params

  return { title: `Posts tagged ${tag}`, description: `All posts tagged ${tag}.` }
}

export default async function TagPage({ params }: { params: Promise<TagParams> }) {
  const { tag } = await params
  const tagged = posts.query({ where: { tags: { has: tag } }, perPage: 50 })

  if (tagged.total === 0) notFound()

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
