import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 3000 },
  build: {
    outDir: 'dist',
    rollupOptions: {
      // ✅ Fix: Capacitor packages لا تتضمن في الـ bundle
      external: [
        '@capacitor/core',
        '@capacitor/app',
        '@capacitor/browser',
        '@capacitor/camera',
      ],
    }
  },
  optimizeDeps: {
    include: ['@supabase/supabase-js'],
  },
  define: {
    global: 'globalThis',
  }
})
