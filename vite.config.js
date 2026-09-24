import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build` -> regular multi-file build in dist/
// `npm run build:single` -> one self-contained HTML file in dist-single/ (easy to share)
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'single' ? [viteSingleFile()] : [],
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    assetsInlineLimit: mode === 'single' ? 100000000 : 4096,
    chunkSizeWarningLimit: 2000,
  },
  server: { host: true },
}));
