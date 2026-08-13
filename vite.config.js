import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const host = process.env.TAURI_DEV_HOST;

// CopyBoard renderer build (Tauri loads dist-react/index.html).
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist-react',
    emptyOutDir: true,
    sourcemap: false,
    target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
  },
  server: {
    host: host || '127.0.0.1',
    port: 3000,
    strictPort: true,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 3001,
        }
      : undefined,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
});
