import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,        // Слушать все IP-адреса (важно для вьювера IDE)
    port: 5173,        // Фиксируем порт
    strictPort: true,  // Если порт занят, не переключаться на другой (чтобы IDE не теряла связь)
  },
})