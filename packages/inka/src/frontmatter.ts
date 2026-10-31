import { parse as parseYaml } from 'yaml'
import { isRecord } from './shared/values.js'

export type FrontmatterResult = {
  data: Record<string, unknown>
  body: string
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n?---(?:\r?\n|$)/

export function parseFrontmatter(source: string): FrontmatterResult {
  const match = FRONTMATTER.exec(source)
  if (!match) return { data: {}, body: source }

  return {
    data: parseData(match[1]),
    body: source.slice(match[0].length),
  }
}

function parseData(raw: string): Record<string, unknown> {
  const parsed: unknown = parseYaml(raw)
  if (parsed === null || parsed === undefined) return {}
  if (!isRecord(parsed)) throw new Error('Expected the frontmatter to be a YAML mapping')
  return parsed
}
