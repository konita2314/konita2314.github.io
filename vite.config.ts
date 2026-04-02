import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'remove-modulepreload',
      transformIndexHtml(html) {
        let cleaned = html.replace(/\s*<link rel="modulepreload"[^>]*>\s*/g, '')
        cleaned = cleaned.replace(/\s+crossorigin="[^"]*"/g, '')
        cleaned = cleaned.replace(/\s+crossorigin/g, '')
        return cleaned
      }
    }
  ],
  base: '/',
  build: {
    minify: 'esbuild',
    cssCodeSplit: false,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
})