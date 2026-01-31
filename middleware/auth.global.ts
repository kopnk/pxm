export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore()

  // halaman publik
  if (to.path.startsWith('/auth')) return

  // pastikan session ter-load
  if (!auth.initialized) {
    await auth.initAuth()
  }

  // belum login
  if (!auth.user) {
    return navigateTo('/auth/signin')
  }
})
