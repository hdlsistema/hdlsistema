import { resolve } from 'node:path'
import { existsSync, rmSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function pruneQaAssetsFromMobileBundle() {
  const qaDir = resolve(__dirname, 'dist-mobile/qa')

  return {
    name: 'prune-qa-assets-from-mobile-bundle',
    closeBundle() {
      if (existsSync(qaDir)) {
        rmSync(qaDir, { recursive: true, force: true })
      }
    },
  }
}

export default defineConfig({
  root: resolve(__dirname, 'src/mobile'),
  envDir: __dirname,
  publicDir: resolve(__dirname, 'public'),
  plugins: [react(), tailwindcss(), pruneQaAssetsFromMobileBundle()],
  define: {
    'import.meta.env.VITE_HDL_APP_TARGET': JSON.stringify('mobile'),
  },
  build: {
    outDir: resolve(__dirname, 'dist-mobile'),
    emptyOutDir: true,
  },
})
