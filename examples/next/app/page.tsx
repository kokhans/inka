import { posts } from '#inka'
import { AppLink } from '../components/AppLink'
import { PostCard } from '../components/PostCard'

export default function HomePage() {
  const latest = posts.list().slice(0, 3)

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Notes on building for the web</h1>
      <p className="mt-3 text-zinc-600 dark:text-zinc-400">
        A demo blog rendered from Markdown files by Inka. Content is generated at build time; the
        app only reads typed collections.
      </p>

      <div className="mt-10 space-y-8">
        {latest.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>

      <p className="mt-8 text-sm">
        <AppLink href="/blog" className="text-blue-600 hover:underline dark:text-blue-400">
          All posts →
        </AppLink>
      </p>
    </div>
  )
}
