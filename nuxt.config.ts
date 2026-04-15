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

  devtools: { enabled: true },

    nitro: {
    preset: "node-server",
  },

  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          quietDeps: true
        }
      }
    }
  }
})
