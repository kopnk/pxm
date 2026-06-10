import { resolveRouteRlsAction, resolveRouteRlsResource } from "~/lib/rls";

export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore();

  if (to.path.startsWith("/auth")) return;

  if (!auth.initialized) {
    await auth.initAuth();
  }

  if (!auth.user) {
    return navigateTo("/auth/signin");
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
