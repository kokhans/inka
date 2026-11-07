import { createFileRoute, notFound } from '@tanstack/react-router'
import { pages } from '#inka'
import { ArticleContent } from '../../components/ArticleContent'

export const Route = createFileRoute('/about')({
  loader: () => {
    const page = pages.get('about')
    if (!page) throw notFound()
    return { page }
  },
  head: () => ({
    meta: [
      { title: 'About · Inka Blog' },
      { name: 'description', content: 'About this demo blog.' },
    ],
  }),
  component: AboutRoute,
})

function AboutRoute() {
  const { page } = Route.useLoaderData()

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">{page.title}</h1>
      <ArticleContent html={page.html} hasMermaid={page.hasMermaid} />
    </div>
  )
}
