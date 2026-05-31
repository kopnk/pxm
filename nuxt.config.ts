export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  /** Server secret for signed PDF URLs (QR works without session). Empty = session cookie only. */
  runtimeConfig: {
    partnerPoPdfSecret: process.env.PARTNER_PO_PDF_SECRET || "",
  },

  ssr: false, // 🔥 INI KUNCINYA

  modules: [
    '@pinia/nuxt'
  ],

  css: [
    '~/assets/scss/main.scss'
  ],

  app: {
    /** Fade singkat antar halaman (CSS di main.scss, tanpa lib tambahan). */
    pageTransition: { name: 'pxm-page', mode: 'default' },
  },

  devtools: {
    enabled: process.env.NUXT_DEVTOOLS === "true",
  },

  nitro: {
    preset: "node-server",
    experimental: {
      websocket: true,
    },
  },

  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          quietDeps: true,
        },
      },
    },
    build: {
      reportCompressedSize: false,
    },
    optimizeDeps: {
      include: [
        "bootstrap/dist/js/bootstrap.bundle.min.js",
        "chart.js",
        "vue-chartjs",
        "xlsx",
      ],
    },
  },
})
