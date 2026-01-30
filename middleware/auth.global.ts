// middleware/auth.global.ts
export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore()

  // halaman publik
  if (to.path.startsWith('/auth')) return

  // ⏳ tunggu restore session
  if (!auth.initialized) {
    await auth.initAuth()
  }

  // ❌ benar-benar tidak login
  if (!auth.user) {
    return navigateTo('/auth/signin')
  }
})

