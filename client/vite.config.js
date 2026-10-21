import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
export default defineConfig({
  plugins: [vue()],
  base: './',
  build: { outDir: '../docs', emptyOutDir: true },
  server: {
    port: 5192,
    proxy: {
      '/api': 'http://localhost:8822',
      '/socket.io': { target: 'http://localhost:8822', ws: true },
    },
  },
})
