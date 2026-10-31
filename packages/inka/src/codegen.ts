import type { Entry, RuntimeCollection } from './types.js'

export type BuiltCollection = {
  name: string
  definition: RuntimeCollection
  entries: Entry[]
}

export function renderIndexModule(collections: BuiltCollection[]): string {
  const imports = collections.map(
    (item) => `import ${entryName(item.name)} from './${item.name}.json'`,
  )
  const declarations = collections.map((item) => renderCollection(item))

  return [
    `import { createCollection } from 'inka/query'`,
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
  const imports = [`import type { Collection } from 'inka/query'`]
  imports.push(
    configImport
      ? `import type { EntryOf } from 'inka'`
      : `import type { Entry } from 'inka/query'`,
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

  return `export const ${item.name} = createCollection(${entryName(item.name)}, ${renderObject(config)})\n`
}

function renderObject(value: Record<string, unknown>): string {
  const lines = Object.entries(value).map(([key, item]) => `  ${key}: ${JSON.stringify(item)},`)
  return `{\n${lines.join('\n')}\n}`
}

function entryName(collection: string): string {
  return `${collection}Entries`
}
