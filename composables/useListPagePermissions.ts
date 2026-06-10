import { computed } from "vue";
import { useAuthStore } from "@/stores/auth";
import type { RlsAction, RlsResource } from "~/lib/rls";

/**
 * List-page permission checks from RLS matrix (superadmin always allowed).
 */
export function useListPagePermissions(resource: RlsResource) {
  const auth = useAuthStore();

  const can = (action: RlsAction) =>
    computed(() => auth.canAccess(resource, action));

  return {
    canCreate: can("create"),
    canEdit: can("update"),
    canDelete: can("delete"),
    canRead: can("read"),
  };
}
