import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://portfolio-krishs-projects-ee4aee87.vercel.app',
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'auto' },
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  devToolbar: { enabled: false },
});
