import { describe, expectTypeOf, it } from 'vitest'
import { collection, defineConfig, z } from '../src/config.js'
import type { Entry, EntryMeta, EntryOf } from '../src/index.js'
import type {
  AdjacentEntries,
  Collection,
  DistinctValue,
  FieldFilter,
  QueryOptions,
  QueryResult,
  WhereOption,
} from '../src/query/index.js'

const config = defineConfig({
  collections: {
    posts: collection({
      folder: 'posts',
      schema: z.object({
        title: z.string(),
        date: z.coerce.date(),
        tags: z.array(z.string()).default([]),
        draft: z.boolean().default(false),
        cover: z.string().optional(),
      }),
      url: (entry) => `/blog/${entry.slug}`,
    }),
  },
})

type Post = EntryOf<typeof config.collections.posts>

describe('EntryOf', () => {
  it('keeps collection names from defineConfig()', () => {
    expectTypeOf(config.collections).toHaveProperty('posts')
    expectTypeOf(config.collections).not.toHaveProperty('pages')
  })

  it('combines the schema output with entry metadata', () => {
    expectTypeOf<Post['title']>().toEqualTypeOf<string>()
    expectTypeOf<Post['date']>().toEqualTypeOf<Date>()
    expectTypeOf<Post['tags']>().toEqualTypeOf<string[]>()
    expectTypeOf<Post['draft']>().toEqualTypeOf<boolean>()
    expectTypeOf<Post['cover']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<Post>().toExtend<EntryMeta>()
  })

  it('falls back to a plain entry without a zod schema', () => {
    expectTypeOf<EntryOf<{ folder: string }>>().toEqualTypeOf<Entry>()
    expectTypeOf<EntryOf<{ schema: { safeParse: () => void } }>>().toEqualTypeOf<Entry>()
  })

  it('types the entry passed to url()', () => {
    collection({
      folder: 'posts',
      schema: z.object({ title: z.string(), date: z.coerce.date() }),
      url: (entry) => {
        expectTypeOf(entry.title).toEqualTypeOf<string>()
        expectTypeOf(entry.date).toEqualTypeOf<Date>()
        expectTypeOf(entry.slug).toEqualTypeOf<string>()
        return `/${entry.slug}`
      },
    })
  })
})

describe('Collection', () => {
  const posts = {} as Collection<Post>

  it('returns full entries from all(), get() and related()', () => {
    expectTypeOf(posts.all()).toEqualTypeOf<Post[]>()
    expectTypeOf(posts.get('hello')).toEqualTypeOf<Post | undefined>()
    expectTypeOf(posts.related('hello')).toEqualTypeOf<Post[]>()
    expectTypeOf(posts.adjacent('hello')).toEqualTypeOf<AdjacentEntries<Post>>()
  })

  it('omits html and body from list()', () => {
    type Listed = ReturnType<typeof posts.list>[number]
    expectTypeOf<Listed>().not.toHaveProperty('html')
    expectTypeOf<Listed>().not.toHaveProperty('body')
    expectTypeOf<Listed['title']>().toEqualTypeOf<string>()
  })

  it('returns partial entries when fields are selected', () => {
    expectTypeOf(posts.all({ select: ['title'] })).toEqualTypeOf<Partial<Post>[]>()
    expectTypeOf(posts.query({ select: ['title'] })).toEqualTypeOf<QueryResult<Partial<Post>>>()
    expectTypeOf(posts.query()).toEqualTypeOf<QueryResult<Post>>()
    expectTypeOf(posts.query({ page: 2 })).toEqualTypeOf<QueryResult<Post>>()
  })

  it('accepts only entry fields in distinct()', () => {
    expectTypeOf(posts.distinct('tags')).toEqualTypeOf<DistinctValue[]>()
    // @ts-expect-error unknown field
    posts.distinct('missing')
  })
})

describe('QueryOptions', () => {
  it('types filters by field', () => {
    expectTypeOf<FieldFilter<string[]>['has']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<FieldFilter<Date>['gte']>().toEqualTypeOf<Date | undefined>()
    expectTypeOf<WhereOption<Post>['draft']>().toEqualTypeOf<
      boolean | FieldFilter<boolean> | undefined
    >()
  })

  it('accepts valid where clauses', () => {
    expectTypeOf({
      where: {
        draft: false,
        tags: { has: 'react' },
        date: { gte: new Date('2026-01-01') },
        title: { contains: 'loomark', not: 'Draft' },
      },
      sort: { date: 'desc' },
      page: 1,
      perPage: 10,
    } as const).toExtend<QueryOptions<Post>>()
  })

  it('rejects invalid where clauses', () => {
    const posts = {} as Collection<Post>
    // @ts-expect-error unknown field
    posts.query({ where: { missing: true } })
    // @ts-expect-error wrong value type
    posts.query({ where: { draft: 'yes' } })
    // @ts-expect-error has expects an array item
    posts.query({ where: { tags: { has: 1 } } })
    // @ts-expect-error gte expects a date
    posts.query({ where: { date: { gte: 'yesterday' } } })
    // @ts-expect-error sort direction must be asc or desc
    posts.query({ sort: { date: 'up' } })
  })
})
