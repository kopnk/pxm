/** Sync UI permissions when user kembali ke tab (setelah diubah di RLS). */
export default defineNuxtPlugin(() => {
  const auth = useAuthStore();

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible" || !auth.user) return;
    void auth.refreshSession();
  });
});
