import { sortEntries } from '../shared/sort.js'
import { asRecord, compareValues, equalsValue, readField, toArray } from '../shared/values.js'
import type { SearchOption, SortOption } from '../types.js'

export type { Entry, SearchOption, SortDirection, SortOption, TocItem } from '../types.js'

export type ArrayItem<V> = V extends readonly (infer Item)[] ? Item : never

export type FieldFilter<V> = {
  equals?: V
  in?: readonly V[]
  has?: ArrayItem<V>
  hasSome?: readonly ArrayItem<V>[]
  hasEvery?: readonly ArrayItem<V>[]
  gt?: V
  gte?: V
  lt?: V
  lte?: V
  contains?: string
  not?: V | FieldFilter<V>
}

export type WhereOption<T> = { [K in keyof T]?: T[K] | FieldFilter<T[K]> }

export type QueryOptions<T> = {
  where?: WhereOption<T>
  search?: string
  sort?: SortOption
  page?: number
  perPage?: number
  select?: readonly string[]
}

export type QueryResult<T> = {
  items: T[]
  total: number
  perPage: number
  page: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export type DistinctValue = {
  value: string
  count: number
}

export type AdjacentEntries<T> = {
  prev: T | undefined
  next: T | undefined
}

export type RelatedOptions = {
  by?: string
  limit?: number
}

export type CollectionConfig = {
  name: string
  sort?: SortOption
  search?: SearchOption
  perPage?: number
  dates?: string[]
}

export type Collection<T extends object> = {
  name: string
  all(): T[]
  all(options: { select: readonly string[] }): Partial<T>[]
  list(): Omit<T, 'html' | 'body'>[]
  get(slug: string): T | undefined
  query(): QueryResult<T>
  query(options: QueryOptions<T> & { select: readonly string[] }): QueryResult<Partial<T>>
  query(options: QueryOptions<T>): QueryResult<T>
  distinct(field: keyof T & string): DistinctValue[]
  adjacent(slug: string): AdjacentEntries<T>
  related(slug: string, options?: RelatedOptions): T[]
}

type Operator = (value: unknown, expected: unknown) => boolean

const DEFAULT_PER_PAGE = 10
const DEFAULT_SEARCH_FIELDS = ['title', 'body']
const DEFAULT_RELATED_FIELD = 'tags'
const DEFAULT_RELATED_LIMIT = 3

const operators: Record<string, Operator> = {
  equals: (value, expected) => equalsValue(value, expected),
  in: (value, expected) => toArray(expected).some((item) => equalsValue(value, item)),
  has: (value, expected) => toArray(value).some((item) => equalsValue(item, expected)),
  hasSome: (value, expected) =>
    toArray(expected).some((candidate) =>
      toArray(value).some((item) => equalsValue(item, candidate)),
    ),
  hasEvery: (value, expected) =>
    toArray(expected).every((candidate) =>
      toArray(value).some((item) => equalsValue(item, candidate)),
    ),
  gt: (value, expected) => compare(value, expected, (order) => order > 0),
  gte: (value, expected) => compare(value, expected, (order) => order >= 0),
  lt: (value, expected) => compare(value, expected, (order) => order < 0),
  lte: (value, expected) => compare(value, expected, (order) => order <= 0),
  contains: (value, expected) =>
    typeof value === 'string' &&
    typeof expected === 'string' &&
    value.toLowerCase().includes(expected.toLowerCase()),
  not: (value, expected) => !matchesValue(value, expected),
}

function compare(value: unknown, expected: unknown, test: (order: number) => boolean): boolean {
  if (value === undefined || value === null) return false
  if (expected === undefined || expected === null) return false
  return test(compareValues(value, expected))
}

function matchesWhere(entry: object, where: object | undefined): boolean {
  if (!where) return true
  return Object.entries(asRecord(where)).every(([field, condition]) =>
    matchesValue(readField(entry, field), condition),
  )
}

function matchesValue(value: unknown, condition: unknown): boolean {
  if (!isFilter(condition)) return equalsValue(value, condition)
  return Object.entries(condition).every(([name, expected]) => {
    const operator = operators[name]
    return operator ? operator(value, expected) : false
  })
}

function isFilter(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  if (value instanceof Date) return false
  return Object.keys(value).some((key) => key in operators)
}

export function createCollection<T extends object>(
  entries: readonly T[],
  config: CollectionConfig,
): Collection<T> {
  const items = sortEntries(
    entries.map((entry) => reviveDates(entry, config.dates)),
    config.sort,
  )

  function all(): T[]
  function all(options: { select: readonly string[] }): Partial<T>[]
  function all(options?: { select?: readonly string[] }): T[] | Partial<T>[] {
    return items.map((entry) => selectFields(entry, options?.select))
  }

  function list(): Omit<T, 'html' | 'body'>[] {
    return items.map((entry) => omitContent(entry))
  }

  function get(slug: string): T | undefined {
    return items.find((entry) => readField(entry, 'slug') === slug)
  }

  function query(): QueryResult<T>
  function query(options: QueryOptions<T> & { select: readonly string[] }): QueryResult<Partial<T>>
  function query(options: QueryOptions<T>): QueryResult<T>
  function query(options: QueryOptions<T> = {}): QueryResult<T> | QueryResult<Partial<T>> {
    const filtered = items.filter((entry) => matchesWhere(entry, options.where))
    const found = options.search ? rankBySearch(filtered, options.search, config.search) : filtered
    const sorted = sortEntries(found, options.sort ?? (options.search ? undefined : config.sort))
    const paginated = paginate(sorted, options.page, options.perPage ?? config.perPage)

    return {
      ...paginated,
      items: paginated.items.map((entry) => selectFields(entry, options.select)),
    }
  }

  function distinct(field: keyof T & string): DistinctValue[] {
    const counts = new Map<string, number>()
    for (const entry of items) {
      for (const value of toArray(readField(entry, field))) {
        if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
          continue
        }
        const key = String(value)
        counts.set(key, (counts.get(key) ?? 0) + 1)
      }
    }

    return [...counts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value))
  }

  function adjacent(slug: string): AdjacentEntries<T> {
    const index = items.findIndex((entry) => readField(entry, 'slug') === slug)
    if (index === -1) return { prev: undefined, next: undefined }
    return { prev: items[index - 1], next: items[index + 1] }
  }

  function related(slug: string, options: RelatedOptions = {}): T[] {
    const entry = get(slug)
    if (!entry) return []

    const field = options.by ?? DEFAULT_RELATED_FIELD
    const limit = options.limit ?? DEFAULT_RELATED_LIMIT
    const source = toArray(readField(entry, field))

    return items
      .filter((candidate) => candidate !== entry)
      .map((candidate) => ({
        entry: candidate,
        shared: sharedValues(source, toArray(readField(candidate, field))),
      }))
      .filter((item) => item.shared > 0)
      .sort((left, right) => right.shared - left.shared)
      .slice(0, limit)
      .map((item) => item.entry)
  }

  return { name: config.name, all, list, get, query, distinct, adjacent, related }
}

function sharedValues(left: unknown[], right: unknown[]): number {
  return left.filter((value) => right.some((other) => equalsValue(value, other))).length
}

function rankBySearch<T extends object>(
  entries: T[],
  query: string,
  search: SearchOption | undefined,
): T[] {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 0)
  if (terms.length === 0) return entries

  return entries
    .map((entry) => ({ entry, score: scoreEntry(entry, terms, search) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .map((item) => item.entry)
}

function scoreEntry(entry: object, terms: string[], search: SearchOption | undefined): number {
  if (terms.length === 0) return 0

  const fields = search?.fields ?? DEFAULT_SEARCH_FIELDS
  let score = 0

  for (const term of terms) {
    let termScore = 0
    for (const field of fields) {
      const count = countOccurrences(searchableText(readField(entry, field)), term)
      termScore += count * (search?.boost?.[field] ?? 1)
    }
    if (termScore === 0) return 0
    score += termScore
  }

  return score
}

function searchableText(value: unknown): string {
  if (Array.isArray(value)) return value.map((item) => searchableText(item)).join(' ')
  return typeof value === 'string' ? value.toLowerCase() : ''
}

function countOccurrences(text: string, term: string): number {
  let count = 0
  let index = text.indexOf(term)
  while (index !== -1) {
    count += 1
    index = text.indexOf(term, index + term.length)
  }
  return count
}

function paginate<T>(
  items: readonly T[],
  page: number | undefined,
  perPage: number | undefined,
): QueryResult<T> {
  const size = Math.max(1, perPage ?? DEFAULT_PER_PAGE)
  const totalPages = Math.max(1, Math.ceil(items.length / size))
  const current = Math.min(Math.max(1, page ?? 1), totalPages)
  const start = (current - 1) * size

  return {
    items: items.slice(start, start + size),
    total: items.length,
    perPage: size,
    page: current,
    totalPages,
    hasNext: current < totalPages,
    hasPrev: current > 1,
  }
}

function selectFields<T extends object>(entry: T, select: readonly string[] | undefined): T {
  if (!select || select.length === 0) return entry

  const source = asRecord(entry)
  const picked: Record<string, unknown> = {}
  for (const field of select) picked[field] = source[field]
  return picked as T
}

function omitContent<T extends object>(entry: T): Omit<T, 'html' | 'body'> {
  const copy: Record<string, unknown> = { ...asRecord(entry) }
  delete copy['html']
  delete copy['body']
  return copy as Omit<T, 'html' | 'body'>
}

function reviveDates<T extends object>(entry: T, fields: readonly string[] | undefined): T {
  if (!fields || fields.length === 0) return entry

  const copy: Record<string, unknown> = { ...asRecord(entry) }
  for (const field of fields) {
    const value = copy[field]
    if (typeof value === 'string') copy[field] = new Date(value)
  }
  return copy as T
}
