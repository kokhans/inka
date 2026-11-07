export type PostSummary = {
  slug: string
  url: string
  title: string
  description: string
  date: Date
  tags: string[]
  readingTime: number
}

export type TocEntry = {
  depth: number
  text: string
  id: string
}
