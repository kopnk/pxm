import { resolveRouteRlsAction, resolveRouteRlsResource } from "~/lib/rls";

export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore();

  if (to.path.startsWith("/auth")) return;

  if (!auth.initialized) {
    await auth.initAuth();
  }

  if (!auth.user) {
    return navigateTo({
      path: "/auth/signin",
      query: { redirect: to.fullPath },
    });
  }

  if (auth.user.mustChangePassword) {
    const allowed =
      to.path === "/profile/change-password" ||
      to.path.startsWith("/auth/");
    if (!allowed) {
      return navigateTo("/profile/change-password");
    }
    return;
  }

  if (auth.user.role === "superadmin") return;

  const resource = resolveRouteRlsResource(to.path);
  if (resource) {
    const action = resolveRouteRlsAction(to.path);
    if (!auth.canAccess(resource, action)) {
      return navigateTo("/profile");
    }
  }

  if (to.path.startsWith("/rls") && auth.user.role !== "superadmin") {
    return navigateTo("/profile");
  }
});
