import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
  server: {
    port: 3000,
    open: true,
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
})
