import { defineConfig, collection, z } from 'inka'

export default defineConfig({
  siteUrl: 'https://inka.example.com',
  title: 'Inka Blog',
  description: 'A small blog built with Inka, Next.js and Tailwind CSS.',
  contentDir: 'content',
  outDir: '.inka',
  publicDir: 'public',
  collections: {
    posts: collection({
      folder: 'posts',
      schema: z.object({
        title: z.string(),
        description: z.string(),
        date: z.coerce.date(),
        updated: z.coerce.date().optional(),
        tags: z.array(z.string()).default([]),
        cover: z.string().optional(),
        draft: z.boolean().default(false),
      }),
      url: (entry) => `/blog/${entry.slug}`,
      sort: { date: 'desc' },
      search: { fields: ['title', 'description', 'tags', 'body'], boost: { title: 3 } },
      rss: true,
      sitemap: true,
    }),
    pages: collection({
      folder: 'pages',
      schema: z.object({ title: z.string(), description: z.string() }),
      url: (entry) => `/${entry.slug}`,
    }),
  },
})
