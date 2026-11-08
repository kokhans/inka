import type { Element, Root, RootContent } from 'hast'
import type { Plugin } from 'unified'
import rehypeSlug from 'rehype-slug'
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { bundledLanguages, createHighlighter, type Highlighter } from 'shiki'
import { unified } from 'unified'
import type { MarkdownOptions, ShikiTheme, TocItem } from './types.js'

/** Rewrites an image source. Returns undefined to keep the source as written. */
export type ImageResolver = (src: string) => Promise<string | undefined>

export type RenderOptions = {
  markdown?: MarkdownOptions
  resolveImage?: ImageResolver
}

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
// Shiki renders these without a grammar.
const PLAIN_LANGUAGES = new Set(['text', 'txt', 'plain', 'plaintext', 'ansi'])
const WORDS_PER_MINUTE = 200
const EXCERPT_LENGTH = 160
const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4']
const DEFAULT_THEMES: { light: ShikiTheme; dark: ShikiTheme } = {
  light: 'github-light',
  dark: 'github-dark',
}

type CodeState = {
  hasMermaid: boolean
  themes: { light: string; dark: string }
}

const highlighters = new Map<string, Promise<Highlighter>>()
const unknownLanguages = new Set<string>()

/** One highlighter per theme and language setup. Bundled languages are added on demand. */
function getHighlighter(options: MarkdownOptions | undefined): Promise<Highlighter> {
  const themes = options?.shiki?.themes ?? DEFAULT_THEMES
  const langs = options?.shiki?.langs ?? []
  const key = JSON.stringify([themeName(themes.light), themeName(themes.dark), langs.map(langName)])

  let highlighter = highlighters.get(key)
  if (!highlighter) {
    highlighter = createHighlighter({ themes: [themes.light, themes.dark], langs: [...langs] })
    highlighters.set(key, highlighter)
  }
  return highlighter
}

function themeName(theme: ShikiTheme): string {
  return typeof theme === 'string' ? theme : (theme.name ?? 'custom')
}

function langName(lang: string | { name: string }): string {
  return typeof lang === 'string' ? lang : lang.name
}

export async function renderMarkdown(
  body: string,
  options: RenderOptions = {},
): Promise<RenderedMarkdown> {
  const themes = options.markdown?.shiki?.themes ?? DEFAULT_THEMES
  const state: CodeState = {
    hasMermaid: false,
    themes: { light: themeName(themes.light), dark: themeName(themes.dark) },
  }
  const highlighter = await getHighlighter(options.markdown)
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(options.markdown?.remarkPlugins ?? [])
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeSlug)
    .use(rehypeImages, options.resolveImage)
    .use(options.markdown?.rehypePlugins ?? [])
    .use(rehypeCodeBlocks, highlighter, state)
    .use(rehypeStringify, { allowDangerousHtml: true })

  const markdown = processor.parse(body)
  const counts = countWords(markdown)
  await loadCodeLanguages(highlighter, markdown)
  const tree = await processor.run(markdown)
  const html: string = processor.stringify(tree)

  return {
    html,
    toc: collectToc(tree),
    hasMermaid: state.hasMermaid,
    excerpt: collectExcerpt(tree),
    ...counts,
  }
}

/** Loads every bundled Shiki language used by a code block, so any of them highlights. */
async function loadCodeLanguages(highlighter: Highlighter, tree: MarkdownNode): Promise<void> {
  const loaded = new Set(highlighter.getLoadedLanguages())
  const missing = new Set<string>()
  collectCodeLanguages(tree, missing)

  for (const language of missing) {
    if (loaded.has(language) || language === MERMAID_LANGUAGE || PLAIN_LANGUAGES.has(language)) {
      continue
    }
    if (language in bundledLanguages) {
      await highlighter.loadLanguage(language as keyof typeof bundledLanguages)
    } else if (!unknownLanguages.has(language)) {
      unknownLanguages.add(language)
      console.warn(`loomark: unknown code language "${language}", rendered as plain text`)
    }
  }
}

function collectCodeLanguages(node: MarkdownNode, languages: Set<string>): void {
  if (node.type === 'code' && typeof node.lang === 'string') languages.add(node.lang)
  for (const child of node.children ?? []) collectCodeLanguages(child, languages)
}

const rehypeImages: Plugin<[ImageResolver | undefined], Root, Root> = (resolveImage) => {
  return async (tree: Root): Promise<void> => {
    if (!resolveImage) return
    for (const image of findElements(tree, ['img'])) {
      const src = image.properties['src']
      if (typeof src !== 'string') continue
      const resolved = await resolveImage(src)
      if (resolved !== undefined) image.properties['src'] = resolved
    }
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

  return { type: 'raw', value: highlight(highlighter, source, language, state) }
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

function highlight(
  highlighter: Highlighter,
  source: string,
  language: string,
  state: CodeState,
): string {
  const known = highlighter.getLoadedLanguages().includes(language)
  return highlighter.codeToHtml(source, {
    lang: known ? language : FALLBACK_LANGUAGE,
    themes: state.themes,
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

type MarkdownNode = {
  type: string
  value?: unknown
  lang?: unknown
  children?: MarkdownNode[]
}

// Prose text only: code blocks, raw HTML and link URLs are not read as words.
const PROSE_TYPES = new Set(['text', 'inlineCode'])

function countWords(tree: MarkdownNode): { wordCount: number; readingTime: number } {
  const words = proseText(tree).split(/\s+/).filter(Boolean)
  const wordCount = words.length
  return { wordCount, readingTime: Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE)) }
}

function proseText(node: MarkdownNode): string {
  if (PROSE_TYPES.has(node.type) && typeof node.value === 'string') return node.value
  return (node.children ?? []).map((child) => proseText(child)).join(' ')
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
