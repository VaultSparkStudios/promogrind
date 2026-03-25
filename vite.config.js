import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_APP_BASE_PATH || '/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // React vendor — cached separately so app deploys don't bust the React download
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
