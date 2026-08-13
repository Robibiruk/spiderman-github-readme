import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vercel SPA: output to dist/, allow hosting root plus the profile payload
// under public/. Everything is static — no server runtime.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
