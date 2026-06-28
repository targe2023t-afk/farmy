import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    // ✅ PWA: Service Worker عشان التطبيق يشتغل offline فعلياً
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Farmy',
        short_name: 'Farmy',
        description: 'نظام إدارة المزرعة',
        theme_color: '#0d631b',
        background_color: '#f7f9f6',
        display: 'standalone',
        orientation: 'portrait',
        dir: 'rtl',
        lang: 'ar',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // ✅ تجاهل Capacitor packages في الـ precache
        navigateFallbackDenylist: [/^\/capacitor/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              expiration: { maxEntries: 50, maxAgeSeconds: 86400 },
              networkTimeoutSeconds: 5
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          }
        ]
      }
    })
  ],
  server: { port: 3000 },
  build: {
    outDir: 'dist',
  },
  optimizeDeps: {
    include: ['@supabase/supabase-js'],
  },
  define: {
    global: 'globalThis',
  }
})
