import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://krishgupta.vercel.app',
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'auto' },
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  devToolbar: { enabled: false },
});
