import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    query: 'src/query/index.ts',
    search: 'src/search/index.ts',
    mermaid: 'src/mermaid/index.ts',
    next: 'src/next/index.ts',
    vite: 'src/vite/index.ts',
    seo: 'src/seo/index.ts',
  },
  format: 'esm',
  platform: 'node',
  target: 'node22',
  dts: true,
  clean: true,
  fixedExtension: false,
  hash: false,
  deps: {
    neverBundle: ['mermaid'],
  },
})
