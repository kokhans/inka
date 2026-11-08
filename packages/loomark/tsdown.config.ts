import { defineConfig, type UserConfig } from 'tsdown'

const shared: UserConfig = {
  format: 'esm',
  dts: true,
  clean: true,
  fixedExtension: false,
  hash: false,
  deps: {
    neverBundle: ['mermaid'],
  },
}

export default defineConfig([
  {
    ...shared,
    // Build-time entries run in Node: the build pipeline, the framework integrations and the CLI.
    entry: {
      index: 'src/index.ts',
      next: 'src/next/index.ts',
      vite: 'src/vite/index.ts',
      cli: 'src/cli/index.ts',
    },
    platform: 'node',
    target: 'node22',
  },
  {
    ...shared,
    // Runtime entries are shipped to the browser, so they must not assume Node.
    entry: {
      query: 'src/query/index.ts',
      search: 'src/search/index.ts',
      mermaid: 'src/mermaid/index.ts',
      seo: 'src/seo/index.ts',
    },
    platform: 'neutral',
    target: 'es2022',
    outputOptions: {
      chunkFileNames: 'runtime-[name].js',
    },
  },
])
