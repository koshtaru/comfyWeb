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
      '@/constants': resolve('./src/constants'),
      '@/pages': resolve('./src/pages'),
    },
  },
  server: {
    port: 3000,
    open: true,
    host: true, // Allow network access
  },
  build: {
    target: 'esnext',
    sourcemap: true,
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Optimize chunk splitting for better caching
        manualChunks: {
          // Core React libraries
          vendor: ['react', 'react-dom'],
          
          // Routing
          router: ['react-router-dom'],
          
          // State management
          store: ['zustand'],
          
          // API and HTTP
          api: ['axios'],
          
          // UI and styling (if using large UI libraries in future)
          // ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        },
        // Generate consistent chunk names
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
          if (facadeModuleId) {
            const name = facadeModuleId.split('/').pop()?.replace('.tsx', '').replace('.ts', '')
            return `chunks/${name}-[hash].js`
          }
          return 'chunks/[name]-[hash].js'
        },
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Asset optimization
    assetsDir: 'assets',
    cssCodeSplit: true,
  },
  // Performance optimizations
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'zustand',
      'axios',
    ],
  },
  // Environment variables
  envPrefix: 'VITE_',
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __VERSION__: JSON.stringify(process.env.npm_package_version || '0.0.0'),
  },
})
