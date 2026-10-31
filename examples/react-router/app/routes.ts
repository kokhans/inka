import type { RouteConfig } from '@react-router/dev/routes'
import { index, route } from '@react-router/dev/routes'

export default [
  index('routes/home.tsx'),
  route('blog', 'routes/blog.tsx'),
  route('blog/:slug', 'routes/post.tsx'),
  route('tags/:tag', 'routes/tag.tsx'),
  route('search', 'routes/search.tsx'),
  route('about', 'routes/about.tsx'),
] satisfies RouteConfig
