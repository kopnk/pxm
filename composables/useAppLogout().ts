export async function useAppLogout() {
  const auth = useAuthStore()
  const profile = useProfileStore()
  const router = useRouter()

  // 1. backend logout + clear auth
  await auth.logout()

  // 2. clear semua store lain
  profile.clear()
  // nanti tinggal tambah:
  // useUsersStore().clear()
  // useProjectStore().clear()

  // 3. redirect
  await router.replace('/auth/signin')
}
