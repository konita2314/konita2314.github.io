import { fileURLToPath, URL } from 'node:url'
import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    vue(),
    {
      // GitHub Pages SPA fallback：未知路径返回 404.html（内容 = index.html），
      // 客户端路由按 location.pathname 渲染正确页面
      name: 'copy-404',
      closeBundle() {
        copyFileSync(resolve('dist/index.html'), resolve('dist/404.html'))
      },
    },
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // Vite 8 默认 minify: 'oxc'（esbuild 需另装包，不引入）
    cssCodeSplit: false,
    sourcemap: false,
  },
})
