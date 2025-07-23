import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    typecheck: {
      checker: 'tsc',
      tsconfig: './tsconfig.json',
    },
  },
  resolve: {
    alias: {
      '@': resolve('./src'),
      '@/components': resolve('./src/components'),
      '@/hooks': resolve('./src/hooks'),
      '@/services': resolve('./src/services'),
      '@/store': resolve('./src/store'),
      '@/types': resolve('./src/types'),
      '@/utils': resolve('./src/utils'),
      '@/styles': resolve('./src/styles'),
    },
  },
})
