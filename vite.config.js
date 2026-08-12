import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// CopyBoard renderer build (Electron loads dist-react/index.html)
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist-react',
    emptyOutDir: true,
    sourcemap: false,
    target: 'chrome126',
  },
  server: {
    host: '127.0.0.1',
    port: 3000,
    strictPort: true,
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
});
