import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    // 设置代理，解决本地开发跨域问题
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // 这里是你 server.js 运行的端口
        changeOrigin: true,
        // 如果你的后端接口就是 /api/login，这里不需要重写路径
      }
    }
  }
})