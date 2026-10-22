import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import pkg from './package.json';

// `--mode single` builds one self-contained HTML file for previews; the default build is the installable PWA.
export default defineConfig(({ mode }) => ({
  base: './',
  define: { __APP_VERSION__: JSON.stringify((pkg as { appVersion?: string }).appVersion ?? pkg.version) },
  plugins: mode === 'single' ? [react(), viteSingleFile()] : [react()],
  build: mode === 'single' ? { outDir: 'dist-single', assetsInlineLimit: 100_000_000 } : { outDir: 'dist' },
  test: { environment: 'node' },
}));
