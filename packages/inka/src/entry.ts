import path from 'node:path'
import { parseFrontmatter, type FrontmatterResult } from './frontmatter.js'
import { renderMarkdown } from './markdown.js'
import { readField } from './shared/values.js'
import { slugFromFile } from './slug.js'
import type { Entry, RuntimeCollection, ValidationError } from './types.js'
import { validateFrontmatter } from './validate.js'

export type EntryInput = {
  source: string
  filePath: string
  folder: string
  cwd: string
  collectionName: string
  definition: RuntimeCollection
}

export type EntryResult = { ok: true; entry: Entry } | { ok: false; errors: ValidationError[] }

type UrlResolver = (entry: Entry) => string

export async function createEntry(input: EntryInput): Promise<EntryResult> {
  const file = path.relative(input.cwd, input.filePath).split(path.sep).join('/')

  let frontmatter: FrontmatterResult
  try {
    frontmatter = parseFrontmatter(input.source)
  } catch (error) {
    return {
      ok: false,
      errors: [
        {
          file,
          collection: input.collectionName,
          field: 'frontmatter',
          message: error instanceof Error ? error.message : String(error),
        },
      ],
    }
  }

  const validated = validateFrontmatter({
    schema: input.definition.schema,
    data: frontmatter.data,
    file,
    collection: input.collectionName,
  })
  if (!validated.ok) return validated

  const fields = validated.data
  const rendered = await renderMarkdown(frontmatter.body)
  const slug = slugOf(fields, input.folder, input.filePath)
  const excerpt = typeof fields['excerpt'] === 'string' ? fields['excerpt'] : rendered.excerpt

  const entry: Entry = {
    ...fields,
    slug,
    url: '',
    collection: input.collectionName,
    filePath: file,
    html: rendered.html,
    body: frontmatter.body,
    excerpt,
    toc: rendered.toc,
    readingTime: rendered.readingTime,
    wordCount: rendered.wordCount,
    hasMermaid: rendered.hasMermaid,
  }

  return { ok: true, entry: { ...entry, url: resolveUrl(input.definition, entry) } }
}

function slugOf(fields: Record<string, unknown>, folder: string, filePath: string): string {
  const slug = fields['slug']
  return typeof slug === 'string' && slug.length > 0 ? slug : slugFromFile(folder, filePath)
}

function resolveUrl(definition: RuntimeCollection, entry: Entry): string {
  const resolve = definition.url as UrlResolver
  return resolve(entry)
}

export function isDraft(entry: Entry): boolean {
  return readField(entry, 'draft') === true
}
