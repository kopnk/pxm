import { computed, reactive } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useUserRegionSelect } from "@/composables/useUserRegionSelect";
import { useUsersApi } from "@/composables/useUsersApi";
import { useFormHandler } from "@/composables/useFormHandler";
import { toastSuccessUpdated } from "@/composables/useToastMessages";
import {
  getEditableUserRoles,
  isSuperadminRole,
} from "~/lib/userRoles";
import type { User } from "~/stores/users";

export const useUserUpdateForm = (originalUser: User) => {
  const authStore = useAuthStore();
  const { updateUser } = useUsersApi();
  const { loading, handle } = useFormHandler();

  if (isSuperadminRole(originalUser.role)) {
    navigateTo("/users");
  }

  const user = reactive({
    id: originalUser.id,
    email: originalUser.email,
    firstName: originalUser.firstName,
    lastName: originalUser.lastName,
    phone: originalUser.phone,
    role: originalUser.role,
    isActive: originalUser.isActive,
    avatarUrl: originalUser.avatarUrl,
    lastLoginAt: originalUser.lastLoginAt,
    createdAt: originalUser.createdAt,
    updatedAt: originalUser.updatedAt,
  });

  const {
    regions,
    areas,
    selectedRegionId,
    selectedAreaId,
    regionsLoading,
    areasLoading,
    assertRegionAreaSelected,
  } = useUserRegionSelect({
    region: originalUser.region,
    area: originalUser.area,
  });

  const editableRoles = computed(() =>
    getEditableUserRoles(authStore.user?.role, originalUser.role),
  );

  const canEditRole = computed(
    () =>
      authStore.user?.role?.toLowerCase() === "superadmin" &&
      editableRoles.value.length > 0,
  );

  const canEditStatus = computed(
    () => authStore.user?.role?.toLowerCase() === "superadmin",
  );

  const submit = async () => {
    const { regionName, areaName } = assertRegionAreaSelected();

    await handle(async () => {
      const payload: Partial<User> = {
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        region: regionName,
        area: areaName,
        avatarUrl: user.avatarUrl,
      };

      if (canEditRole.value) {
        payload.role = user.role;
      }

      if (canEditStatus.value) {
        payload.isActive = user.isActive;
      }

      await updateUser(user.id, payload);
      await navigateTo("/users");
    }, toastSuccessUpdated("user"));
  };

  return {
    user,
    regions,
    areas,
    selectedRegionId,
    selectedAreaId,
    regionsLoading,
    areasLoading,
    editableRoles,
    canEditRole,
    canEditStatus,
    loading,
    submit,
  };
};
