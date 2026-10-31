import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { pages } from '#inka'
import { ArticleContent } from '../../components/ArticleContent'

export const metadata: Metadata = {
  title: 'About',
  description: 'About this demo blog.',
}

export default function AboutPage() {
  const page = pages.get('about')
  if (!page) notFound()

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">{page.title}</h1>
      <ArticleContent html={page.html} hasMermaid={page.hasMermaid} />
    </div>
  )
}
