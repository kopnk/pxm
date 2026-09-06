import { computed, reactive, watch } from "vue";
import { getCreatableUserRoles } from "~/lib/userRoles";
import { useAuthStore } from "@/stores/auth";
import { useUserRegionSelect } from "@/composables/useUserRegionSelect";
import { useUsersApi } from "@/composables/useUsersApi";
import { useFormHandler } from "@/composables/useFormHandler";
import { toastSuccessCreated } from "@/composables/useToastMessages";
import { getApiErrorMessage } from "@/lib/apiError";

export const useUserSignupForm = () => {
  const authStore = useAuthStore();
  const { signupUser } = useUsersApi();
  const { loading, handle } = useFormHandler();
  const temporaryPassword = ref("");

  const creatableRoles = computed(() =>
    getCreatableUserRoles(authStore.user?.role),
  );

  const user = reactive({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    role: "staff",
    isActive: true,
    avatarUrl: "http://profile/update",
  });

  const {
    regions,
    areas,
    selectedRegionId,
    selectedAreaId,
    regionsLoading,
    areasLoading,
    assertRegionAreaSelected,
  } = useUserRegionSelect();

  watch(
    creatableRoles,
    (roles) => {
      if (!roles.length) return;
      const defaultRole = roles[0];
      if (defaultRole && !roles.includes(user.role as (typeof roles)[number])) {
        user.role = defaultRole;
      }
    },
    { immediate: true },
  );

  const getSignupErrorMessage = (err: unknown) => {
    const anyErr = err as {
      data?: { data?: { fieldErrors?: Record<string, string[]> }; message?: string };
      message?: string;
    };

    const fieldErrors = anyErr?.data?.data?.fieldErrors;
    if (fieldErrors) {
      const first = Object.values(fieldErrors).flat()[0];
      if (first) return first;
    }

    return getApiErrorMessage(err, "Signup failed");
  };

  const submit = async () => {
    const { regionName, areaName } = assertRegionAreaSelected();

    await handle(async () => {
      try {
        const response = await signupUser({
          email: user.email.trim(),
          firstName: user.firstName.trim(),
          lastName: user.lastName.trim(),
          phone: user.phone.trim(),
          region: regionName,
          area: areaName,
          role: user.role,
          isActive: user.isActive,
          avatarUrl: user.avatarUrl,
        });

        temporaryPassword.value = response.data.temporaryPassword;
      } catch (err: unknown) {
        throw new Error(getSignupErrorMessage(err));
      }
    }, toastSuccessCreated("user"));
  };

  const closeTemporaryPassword = async () => {
    temporaryPassword.value = "";
    await navigateTo("/users");
  };

  return {
    user,
    regions,
    areas,
    selectedRegionId,
    selectedAreaId,
    regionsLoading,
    areasLoading,
    loading,
    creatableRoles,
    temporaryPassword,
    submit,
    closeTemporaryPassword,
  };
};
