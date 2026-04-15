import { computed } from "vue";
import { useAuthStore } from "@/stores/auth";

/**
 * Shared list-page role checks (create/edit = admin+superadmin, delete = superadmin).
 */
export function useListPagePermissions() {
  const auth = useAuthStore();

  const canCreate = computed(() =>
    ["admin", "superadmin"].includes(auth.user?.role || ""),
  );

  const canEdit = computed(() =>
    ["admin", "superadmin"].includes(auth.user?.role || ""),
  );

  const canDelete = computed(() => auth.user?.role === "superadmin");

  return { canCreate, canEdit, canDelete };
}
