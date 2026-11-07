import type { Element, Root, RootContent } from 'hast'
import type { Plugin } from 'unified'
import rehypeSlug from 'rehype-slug'
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { createHighlighter, type Highlighter } from 'shiki'
import { unified } from 'unified'
import type { TocItem } from './types.js'

export type RenderedMarkdown = {
  html: string
  toc: TocItem[]
  hasMermaid: boolean
  excerpt: string
  wordCount: number
  readingTime: number
}

const MERMAID_LANGUAGE = 'mermaid'
const FALLBACK_LANGUAGE = 'text'
const WORDS_PER_MINUTE = 200
const EXCERPT_LENGTH = 160
const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4']
const THEMES = { light: 'github-light', dark: 'github-dark' }
const CODE_LANGUAGES = [
  'bash',
  'css',
  'diff',
  'html',
  'js',
  'json',
  'jsx',
  'md',
  'ts',
  'tsx',
  'yaml',
  'text',
] as const

type CodeState = {
  hasMermaid: boolean
}

let highlighterPromise: Promise<Highlighter> | undefined

function getHighlighter(): Promise<Highlighter> {
  highlighterPromise ??= createHighlighter({
    themes: [THEMES.light, THEMES.dark],
    langs: [...CODE_LANGUAGES],
  })
  return highlighterPromise
}

export async function renderMarkdown(body: string): Promise<RenderedMarkdown> {
  const state: CodeState = { hasMermaid: false }
  const highlighter = await getHighlighter()
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeSlug)
    .use(rehypeCodeBlocks, highlighter, state)
    .use(rehypeStringify, { allowDangerousHtml: true })

  const tree = await processor.run(processor.parse(body))
  const html: string = processor.stringify(tree)

  return {
    html,
    toc: collectToc(tree),
    hasMermaid: state.hasMermaid,
    excerpt: collectExcerpt(tree),
    ...countWords(body),
  }
}

const rehypeCodeBlocks: Plugin<[Highlighter, CodeState], Root, Root> = (highlighter, state) => {
  return (tree: Root): void => {
    transformCodeBlocks(tree, highlighter, state)
  }
}

function transformCodeBlocks(
  parent: Root | Element,
  highlighter: Highlighter,
  state: CodeState,
): void {
  const children: RootContent[] = parent.children.map((child) => {
    if (child.type !== 'element') return child
    return highlightCodeBlock(child, highlighter, state) ?? child
  })

  parent.children = children
  for (const child of parent.children) {
    if (child.type === 'element') transformCodeBlocks(child, highlighter, state)
  }
}

function highlightCodeBlock(
  element: Element,
  highlighter: Highlighter,
  state: CodeState,
): RootContent | undefined {
  if (element.tagName !== 'pre') return undefined
  const code = codeElement(element)
  if (!code) return undefined

  const source = textContent(code)
  const language = languageOf(code)
  if (language === MERMAID_LANGUAGE) {
    state.hasMermaid = true
    return mermaidBlock(source)
  }

  return { type: 'raw', value: highlight(highlighter, source, language) }
}

function codeElement(pre: Element): Element | undefined {
  const child = pre.children[0]
  return child?.type === 'element' && child.tagName === 'code' ? child : undefined
}

function languageOf(code: Element): string {
  const className = code.properties['className']
  const classes = Array.isArray(className) ? className.map(String) : []
  const language = classes.find((name) => name.startsWith('language-'))
  return language ? language.slice('language-'.length) : FALLBACK_LANGUAGE
}

function highlight(highlighter: Highlighter, source: string, language: string): string {
  const known = highlighter.getLoadedLanguages().includes(language)
  return highlighter.codeToHtml(source, {
    lang: known ? language : FALLBACK_LANGUAGE,
    themes: THEMES,
    defaultColor: false,
  })
}

function mermaidBlock(source: string): RootContent {
  return {
    type: 'element',
    tagName: 'pre',
    properties: { className: ['mermaid'] },
    children: [{ type: 'text', value: source }],
  }
}

function collectToc(tree: Root): TocItem[] {
  return findElements(tree, HEADING_TAGS).flatMap((heading) => {
    const id = heading.properties['id']
    if (typeof id !== 'string') return []
    return [{ depth: Number(heading.tagName.slice(1)), text: textContent(heading), id }]
  })
}

function collectExcerpt(tree: Root): string {
  const paragraph = findElements(tree, ['p'])[0]
  if (!paragraph) return ''

  const text = textContent(paragraph)
  return text.length > EXCERPT_LENGTH ? `${text.slice(0, EXCERPT_LENGTH).trimEnd()}…` : text
}

function countWords(body: string): { wordCount: number; readingTime: number } {
  const wordCount = body.trim().split(/\s+/).filter(Boolean).length
  return { wordCount, readingTime: Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE)) }
}

function findElements(parent: Root | Element, tagNames: readonly string[]): Element[] {
  const found: Element[] = []
  for (const child of parent.children) {
    if (child.type !== 'element') continue
    if (tagNames.includes(child.tagName)) found.push(child)
    found.push(...findElements(child, tagNames))
  }
  return found
}

function textContent(parent: Root | Element): string {
  return parent.children
    .map((child) => {
      if (child.type === 'text') return child.value
      if (child.type === 'element') return textContent(child)
      return ''
    })
    .join('')
    .trim()
}
