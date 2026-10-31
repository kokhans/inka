import { Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteError } from 'react-router'
import type { ReactNode } from 'react'
import { AppLink } from '../components/AppLink'
import './app.css'

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="bg-white text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6">
          <header className="flex items-center justify-between border-b border-zinc-200 py-6 dark:border-zinc-800">
            <AppLink href="/" className="text-lg font-semibold tracking-tight">
              Inka Blog
            </AppLink>
            <nav className="flex gap-5 text-sm text-zinc-600 dark:text-zinc-400">
              <AppLink href="/blog" className="hover:text-blue-600 dark:hover:text-blue-400">
                Blog
              </AppLink>
              <AppLink href="/search" className="hover:text-blue-600 dark:hover:text-blue-400">
                Search
              </AppLink>
              <AppLink href="/about" className="hover:text-blue-600 dark:hover:text-blue-400">
                About
              </AppLink>
              <a href="/rss.xml" className="hover:text-blue-600 dark:hover:text-blue-400">
                RSS
              </a>
            </nav>
          </header>
          <main className="flex-1 py-10">{children}</main>
          <footer className="border-t border-zinc-200 py-6 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            Built with Inka ·{' '}
            <a href="/sitemap.xml" className="hover:text-blue-600 dark:hover:text-blue-400">
              Sitemap
            </a>
          </footer>
        </div>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  return <Outlet />
}

export function ErrorBoundary() {
  const error = useRouteError()
  const missing =
    typeof error === 'object' && error !== null && 'status' in error && error.status === 404

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">
        {missing ? 'Not found' : 'Something went wrong'}
      </h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        {missing
          ? 'The page you are looking for does not exist.'
          : 'An unexpected error occurred while rendering this page.'}
      </p>
      <p className="mt-6 text-sm">
        <AppLink href="/blog" className="text-blue-600 hover:underline dark:text-blue-400">
          Back to the blog →
        </AppLink>
      </p>
    </div>
  )
}
