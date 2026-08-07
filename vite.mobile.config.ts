import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  root: resolve(__dirname, 'src/mobile'),
  envDir: __dirname,
  publicDir: resolve(__dirname, 'public'),
  plugins: [react(), tailwindcss()],
  define: {
    'import.meta.env.VITE_HDL_APP_TARGET': JSON.stringify('mobile'),
  },
  build: {
    outDir: resolve(__dirname, 'dist-mobile'),
    emptyOutDir: true,
  },
})
