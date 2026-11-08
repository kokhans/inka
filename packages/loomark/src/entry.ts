import path from 'node:path'
import { parseFrontmatter, type FrontmatterResult } from './frontmatter.js'
import type { Asset, AssetResult } from './assets.js'
import { renderMarkdown } from './markdown.js'
import { readField } from './shared/values.js'
import { slugFromFile } from './slug.js'
import type { Entry, MarkdownOptions, RuntimeCollection, ValidationError } from './types.js'
import { validateFrontmatter } from './validate.js'

export type EntryInput = {
  source: string
  filePath: string
  folder: string
  cwd: string
  collectionName: string
  definition: RuntimeCollection
  markdown?: MarkdownOptions
  resolveAsset?: (markdownFile: string, src: string) => Promise<AssetResult>
}

/** A valid entry can still carry errors, such as a missing image, that fail production builds. */
export type EntryResult =
  | { ok: true; entry: Entry; assets: Asset[]; errors: ValidationError[] }
  | { ok: false; errors: ValidationError[] }

type UrlResolver = (entry: Entry) => string

const FILE_REFERENCE = /^\.\.?\//

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

  const assets: Asset[] = []
  const assetErrors: ValidationError[] = []
  const resolveImage = async (src: string, field: string): Promise<string | undefined> => {
    const result = await input.resolveAsset?.(input.filePath, src)
    if (!result) return undefined
    if ('asset' in result) {
      assets.push(result.asset)
      return result.asset.url
    }
    assetErrors.push({ file, collection: input.collectionName, field, message: result.error })
    return undefined
  }

  const fields = await resolveFieldImages(validated.data, resolveImage)
  const rendered = await renderMarkdown(frontmatter.body, {
    markdown: input.markdown,
    resolveImage: (src) => resolveImage(src, 'body'),
  })
  // `z.object()` strips unknown keys, so fall back to the raw frontmatter for `slug`.
  const slug = slugOf({ ...frontmatter.data, ...fields }, input.folder, input.filePath)
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

  return {
    ok: true,
    entry: { ...entry, url: resolveUrl(input.definition, entry) },
    assets,
    errors: assetErrors,
  }
}

/** Frontmatter strings such as `cover: ./cover.png` point at files next to the Markdown file. */
async function resolveFieldImages(
  fields: Record<string, unknown>,
  resolveImage: (src: string, field: string) => Promise<string | undefined>,
): Promise<Record<string, unknown>> {
  const resolved: Record<string, unknown> = { ...fields }
  for (const [field, value] of Object.entries(fields)) {
    if (typeof value !== 'string' || !FILE_REFERENCE.test(value)) continue
    resolved[field] = (await resolveImage(value, field)) ?? value
  }
  return resolved
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
