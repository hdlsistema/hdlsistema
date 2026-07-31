import { defineConfig } from 'vitest/config'

export default defineConfig({
  define: {
    // Simula import.meta.env.VITE_API_BASE_URL en el entorno de test
    'import.meta.env.VITE_API_BASE_URL': '"http://localhost:3001"',
    'import.meta.env.VITE_SUPABASE_URL': '"https://example.supabase.co"',
    'import.meta.env.VITE_SUPABASE_ANON_KEY': '"anon-key"',
    'import.meta.env.VITE_APP_URL': '"http://localhost:5173"',
    'import.meta.env.MODE': '"test"',
    'import.meta.env.DEV': 'false',
    'import.meta.env.PROD': 'false',
    'import.meta.env.SSR': 'false',
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    reporters: ['verbose'],
  },
})
