import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    // 与仓库根目录 React 应用(5173)及常见 ChatBI 本地端口(5174)错开
    port: 5180,
    strictPort: true
  }
})
