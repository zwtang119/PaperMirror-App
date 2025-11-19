import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Fix: Cast process to any to avoid TS error 'Property cwd does not exist on type Process'
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    // IMPORTANT: base: './' is required for GitHub Pages deployment
    base: './',
    define: {
      // WARNING: This injects the API Key into the client-side JavaScript bundle.
      // This is standard for client-side apps, BUT you MUST configure 
      // "HTTP Referrer" restrictions in Google AI Studio to prevent unauthorized use.
      // See DEPLOYMENT_GUIDE.md for details.
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY),
    },
  };
});