// composables/useAppLogout.ts
export const useAppLogout = () => {
  const auth = useAuthStore();
  const profile = useProfileStore();
  const router = useRouter();

  const logout = async () => {
    try {
      await auth.logout(); // call API / clear auth state
    } finally {
      // safety: FE state harus bersih walaupun API error
      profile.clear();
      await router.replace("/auth/signin");
    }
  };

  return { logout };
};
