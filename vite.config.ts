import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@papermirror/types': path.resolve(__dirname, './shared/types/src'),
      '@papermirror/prompts': path.resolve(__dirname, './shared/prompts/src'),
    },
  },
  base: '/PaperMirror/',
  build: {
    outDir: 'dist',
  },
});
