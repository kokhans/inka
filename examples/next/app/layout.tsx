import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { AppLink } from '../components/AppLink'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://inka.example.com'),
  title: {
    default: 'Inka Blog',
    template: '%s · Inka Blog',
  },
  description: 'A small blog built with Inka, Next.js and Tailwind CSS.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
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
      </body>
    </html>
  )
}
