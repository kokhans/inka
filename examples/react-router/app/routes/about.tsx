import { pages } from '#inka'
import { ArticleContent } from '../../components/ArticleContent'

export function meta() {
  return [{ title: 'About · Inka Blog' }, { name: 'description', content: 'About this demo blog.' }]
}

export default function AboutRoute() {
  const page = pages.get('about')
  if (!page) throw new Response('Not found', { status: 404 })

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">{page.title}</h1>
      <ArticleContent html={page.html} hasMermaid={page.hasMermaid} />
    </div>
  )
}
