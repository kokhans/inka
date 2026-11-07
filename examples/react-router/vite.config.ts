import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { loomark } from 'loomark/vite'

export default defineConfig({
  plugins: [loomark(), tailwindcss(), reactRouter()],
})
