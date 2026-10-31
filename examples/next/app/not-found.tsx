import { AppLink } from '../components/AppLink'

export default function NotFound() {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Not found</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        The page you are looking for does not exist.
      </p>
      <p className="mt-6 text-sm">
        <AppLink href="/blog" className="text-blue-600 hover:underline dark:text-blue-400">
          Back to the blog →
        </AppLink>
      </p>
    </div>
  )
}
