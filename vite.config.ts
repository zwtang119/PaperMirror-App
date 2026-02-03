import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  base: '/PaperMirror/',

  build: {
    outDir: 'dist',
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@papermirror/types': path.resolve(__dirname, 'node_modules/@papermirror/types/dist/index.js'),
      '@papermirror/prompts': path.resolve(__dirname, 'node_modules/@papermirror/prompts/dist/index.js'),
    },
  },
});
