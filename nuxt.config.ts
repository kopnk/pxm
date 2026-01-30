export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  ssr: false, // 🔥 INI KUNCINYA

  modules: [
    '@pinia/nuxt'
  ],

  css: [
    '~/assets/scss/main.scss'
  ],

  devtools: { enabled: true },

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
