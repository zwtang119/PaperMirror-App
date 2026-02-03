import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/PaperMirror/',
  build: {
    outDir: 'dist',
  },
  resolve: {
    alias: {
      '@papermirror/types': path.resolve(__dirname, './src/types/index.ts'),
    },
  },
});
