import type { Entry, RuntimeCollection } from './types.js'

export type BuiltCollection = {
  name: string
  definition: RuntimeCollection
  entries: Entry[]
}

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/
const RESERVED_WORDS = new Set([
  'arguments',
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'eval',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'implements',
  'import',
  'in',
  'instanceof',
  'interface',
  'let',
  'new',
  'null',
  'package',
  'private',
  'protected',
  'public',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield',
])
const INTERNAL_PREFIX = '__loomark'
const CREATE_COLLECTION = `${INTERNAL_PREFIX}CreateCollection`

export function assertCollectionName(name: string): void {
  if (!IDENTIFIER.test(name) || RESERVED_WORDS.has(name) || name.startsWith(INTERNAL_PREFIX)) {
    throw new Error(
      `loomark: invalid collection name "${name}". Collection names become JavaScript exports, ` +
        'so use letters, digits, _ or $ (for example "blogPosts"), not a reserved word.',
    )
  }
}

export function renderIndexModule(collections: BuiltCollection[]): string {
  const imports = collections.map(
    (item) => `import ${entryName(item.name)} from './${item.name}.json'`,
  )
  const declarations = collections.map((item) => renderCollection(item))

  return [
    `import { createCollection as ${CREATE_COLLECTION} } from 'loomark/query'`,
    ...imports,
    '',
    ...declarations,
    '',
  ].join('\n')
}

export function renderIndexTypes(
  collections: BuiltCollection[],
  configImport: string | undefined,
): string {
  const imports = [`import type { Collection } from 'loomark/query'`]
  imports.push(
    configImport
      ? `import type { EntryOf } from 'loomark'`
      : `import type { Entry } from 'loomark/query'`,
  )
  if (configImport) imports.push(`import type config from '${configImport}'`)

  const declarations = collections.map((item) => {
    const type = configImport ? `EntryOf<typeof config.collections.${item.name}>` : 'Entry'
    return `export declare const ${item.name}: Collection<${type}>`
  })

  return [`${imports.join('\n')}\n`, ...declarations, ''].join('\n')
}

export function collectDateFields(entries: Entry[]): string[] {
  const fields = new Set<string>()
  for (const entry of entries) {
    for (const [field, value] of Object.entries(entry)) {
      if (value instanceof Date) fields.add(field)
    }
  }
  return [...fields].sort()
}

function renderCollection(item: BuiltCollection): string {
  const config: Record<string, unknown> = { name: item.name }
  if (item.definition.sort) config['sort'] = item.definition.sort
  if (item.definition.search) config['search'] = item.definition.search
  if (item.definition.perPage) config['perPage'] = item.definition.perPage

  const dates = collectDateFields(item.entries)
  if (dates.length > 0) config['dates'] = dates

  return `export const ${item.name} = ${CREATE_COLLECTION}(${entryName(item.name)}, ${renderObject(config)})\n`
}

function renderObject(value: Record<string, unknown>): string {
  const lines = Object.entries(value).map(([key, item]) => `  ${key}: ${JSON.stringify(item)},`)
  return `{\n${lines.join('\n')}\n}`
}

function entryName(collection: string): string {
  return `${INTERNAL_PREFIX}_${collection}`
}
