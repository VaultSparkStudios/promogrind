import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Fail fast if auth bypass is accidentally on during a production build
if (process.env.NODE_ENV === "production" && process.env.VITE_DEV_BYPASS_AUTH === "true") {
  throw new Error("VITE_DEV_BYPASS_AUTH=true must not be set in a production build");
}

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_APP_BASE_PATH || '/',
  build: {
    outDir: 'dist',
    manifest: true,
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // React vendor — cached separately so app deploys don't bust the React download
          vendor: ['react', 'react-dom', 'react-router-dom'],
          // Supabase — large but rarely changes; cache independently
          supabase: ['@supabase/supabase-js'],
          posthog: ['posthog-js'],
          sentry: ['@sentry/react'],
        },
      },
    },
  },
})
