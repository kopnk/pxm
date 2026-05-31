import { computed } from "vue";
import { useAuthStore } from "@/stores/auth";

/**
 * Shared list-page role checks (create/edit = admin+superadmin, delete = superadmin).
 */
export function useListPagePermissions() {
  const auth = useAuthStore();

  const canManage = computed(() =>
    ["admin", "superadmin"].includes(auth.user?.role || ""),
  );

  const canDelete = computed(() => auth.user?.role === "superadmin");

  return { canCreate: canManage, canEdit: canManage, canDelete };
}
