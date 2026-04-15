import { apiFetch } from "~/utils/apiFetch";
import type { ProfileUser } from "~/stores/profile";

type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  data: T;
};

export const useProfileApi = () => {
  const profileStore = useProfileStore();

  const fetchProfile = async (force = false) => {
    if (profileStore.loaded && profileStore.profile && !force) {
      return profileStore.profile;
    }

    try {
      const res = await apiFetch<ApiEnvelope<ProfileUser>>("/api/profile");
      profileStore.setProfile(res.data);
      return res.data;
    } catch (e) {
      profileStore.clear();
      throw e;
    }
  };

  const updateProfile = async (payload: Record<string, unknown>) => {
    const res = await apiFetch<ApiEnvelope<unknown>>("/api/profile", {
      method: "PUT",
      body: payload,
    });

    if (!res.success) {
      throw new Error("Update failed");
    }

    return res;
  };

  const changePassword = async (payload: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    const res = await apiFetch<ApiEnvelope<unknown>>(
      "/api/profile/change-password",
      {
        method: "POST",
        body: payload,
      },
    );

    if (!res.success) {
      throw new Error(res.message || "Change password failed");
    }

    return res;
  };

  return { fetchProfile, updateProfile, changePassword };
};
