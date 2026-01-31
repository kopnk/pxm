export const useProfileApi = () => {
  const updateProfile = async (payload: Record<string, any>) => {
    const { data, error } = await useFetch("/api/profile", {
      method: "PUT",
      body: payload,
      credentials: "include",
    });

    if (error.value) {
      throw new Error(
        error.value.data?.message ||
        error.value.message ||
        "Update failed"
      );
    }

    if (!data.value?.success) {
      throw new Error(data.value?.message || "Update failed");
    }

    return data.value;
  };

  // 🔧 HANYA BAGIAN INI YANG DISESUAIKAN
  const changePassword = async (payload: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    const { data, error } = await useFetch(
      "/api/profile/change-password",
      {
        method: "POST",
        body: payload,
        credentials: "include",
      }
    );

    if (error.value) {
      throw new Error(
        error.value.data?.message ||
        error.value.message ||
        "Change password failed"
      );
    }

    if (!data.value?.success) {
      throw new Error(data.value?.message || "Change password failed");
    }

    return data.value;
  };

  return { updateProfile, changePassword };
};
