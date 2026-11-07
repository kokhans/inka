import { useEffect, useRef } from 'react'
import { renderMermaid } from 'inka/mermaid'

type ArticleContentProps = {
  html: string
  hasMermaid: boolean
}

export function ArticleContent({ html, hasMermaid }: ArticleContentProps) {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!hasMermaid || !container.current) return
    void renderMermaid(container.current, { theme: 'auto' })
  }, [hasMermaid])

  return (
    <div
      ref={container}
      className="prose prose-zinc mt-8 max-w-none dark:prose-invert"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
