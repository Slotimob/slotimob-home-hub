import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: { enabled: false },
      includeAssets: ["sloti-logo.png", "favicon.ico"],
      manifest: {
        name: "SLOTIMOB - Gestão Imobiliária",
        short_name: "SLOTIMOB",
        description: "Sistema de gestão imobiliária completo para corretores",
        theme_color: "#6d28d9",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          {
            src: "/sloti-logo.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/sloti-logo.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/sloti-logo.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,ico,png,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        navigateFallback: null,
        runtimeCaching: [
          {
            // index.html and navigation requests: always network
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: "NetworkOnly",
          },
          {
            // Supabase data requests (exclude auth)
            urlPattern: ({ url }) => {
              return (
                url.hostname.endsWith('.supabase.co') &&
                !url.pathname.startsWith('/auth/') &&
                !url.pathname.includes('/token') &&
                !url.pathname.includes('/session')
              );
            },
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-data-cache",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 5 * 60, // 5 minutes
              },
              networkTimeoutSeconds: 3,
            },
          },
          {
            // Auth requests: always network-only
            urlPattern: ({ url }) => {
              return (
                url.hostname.endsWith('.supabase.co') &&
                (url.pathname.startsWith('/auth/') ||
                 url.pathname.includes('/token') ||
                 url.pathname.includes('/session'))
              );
            },
            handler: "NetworkOnly",
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "@tanstack/react-query"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "@tanstack/react-query"],
    force: true,
  },
}));
