import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

// The version shown on the title screen: package.json version + the commit it was built from.
const version = JSON.parse(readFileSync(new URL('./package.json', import.meta.url))).version;
let commit = '';
try { commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { /* not a git checkout */ }

// `npm run build` -> regular multi-file build in dist/
// `npm run build:single` -> one self-contained HTML file in dist-single/ (easy to share)
export default defineConfig(({ mode, command }) => ({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __APP_BUILD__: JSON.stringify(command === 'serve' ? 'dev' : commit),
  },
  plugins: mode === 'single' ? [viteSingleFile()] : [],
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    assetsInlineLimit: mode === 'single' ? 100000000 : 4096,
    chunkSizeWarningLimit: 2000,
  },
  server: { host: true },
}));
