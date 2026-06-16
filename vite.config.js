import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Когда фронт видит запрос, начинающийся с /api, он перенаправляет его на бэк
      '/api': {
        target: 'http://127.0.0.1:8000', // Адрес твоего локального бэкенда
        changeOrigin: true,
        // Отрезаем /api перед отправкой на бэк, чтобы /api/production/ стало просто /production/
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})