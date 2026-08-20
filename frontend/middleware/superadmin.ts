export default defineNuxtRouteMiddleware(async () => {
  const auth = useAuthStore()

  // safety: pastikan auth sudah init
  if (!auth.initialized) {
    await auth.initAuth()
  }

  if (auth.user?.role !== 'superadmin') {
    return navigateTo('/profile')
  }
})
