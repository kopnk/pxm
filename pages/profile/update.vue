<script setup lang="ts">
const router = useRouter();
const profileStore = useProfileStore();

await profileStore.fetchProfile();

const user = reactive({ ...profileStore.profile! });

const error = ref<string | null>(null);
const loading = ref(false);
const avatarUploaded = ref(false);

/**
 * ============================
 * AVATAR STATE
 * ============================
 */
const previewAvatar = ref<string | null>(null);
const avatarFile = ref<File | null>(null);

const onAvatarChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  console.log("🟢 [AVATAR] File selected:", {
    name: file.name,
    type: file.type,
    size: file.size,
  });

  avatarFile.value = file;
  previewAvatar.value = URL.createObjectURL(file);
};

const uploadAvatar = async () => {
  if (!avatarFile.value) {
    // console.log("⚪ [AVATAR] No avatar file, skip upload");
    return;
  }

  //console.log("🟡 [AVATAR] Uploading avatar...");

  const formData = new FormData();
  formData.append("avatar", avatarFile.value);

  const res = await $fetch("/api/profile/avatar", {
    method: "POST",
    body: formData,
  });

  // console.log("🟢 [AVATAR] Upload success:", res.data.avatarUrl);

  /**
   * 🆕 langsung pakai URL baru (sudah versioned)
   */
  profileStore.applyProfileUpdate({
    avatarUrl: res.data.avatarUrl,
  });

  avatarUploaded.value = true;
};

/**
 * ============================
 * SUBMIT
 * ============================
 */
const submit = async () => {
  //console.log("🚀 [SUBMIT] Submit clicked");
  error.value = null;
  loading.value = true;

  const payload: Record<string, any> = {};
  const original = profileStore.profile!;

  //console.log("📦 [SUBMIT] Original profile:", original);
  //console.log("📝 [SUBMIT] Edited user:", user);

  if (
    typeof user.firstName === "string" &&
    user.firstName.trim() !== "" &&
    user.firstName !== original.firstName
  ) {
    payload.firstName = user.firstName.trim();
  }

  if (
    typeof user.lastName === "string" &&
    user.lastName.trim() !== "" &&
    user.lastName !== original.lastName
  ) {
    payload.lastName = user.lastName.trim();
  }

  if (
    typeof user.phone === "string" &&
    user.phone.trim() !== "" &&
    user.phone !== original.phone
  ) {
    payload.phone = user.phone.trim();
  }

  try {
    //  console.log("➡️ [SUBMIT] Step 1: uploadAvatar()");
    await uploadAvatar();

    if (Object.keys(payload).length === 0 && !avatarUploaded.value) {
      error.value = "No changes to update";
      loading.value = false;
      return;
    }

    if (Object.keys(payload).length > 0) {
      //  console.log("➡️ [SUBMIT] Step 2: update profile", payload);

      await $fetch("/api/profile", {
        method: "PUT",
        body: payload,
      });

      profileStore.applyProfileUpdate(payload);
    } else {
      // console.log("ℹ️ [SUBMIT] Skip profile update (no text changes)");
    }

    await router.replace("/profile");
  } catch (e: any) {
    error.value =
      e?.data?.statusMessage ||
      e?.data?.message ||
      e?.message ||
      "Update failed";
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="card">
    <div class="card-body">
      <h5 class="mb-4">Edit Profile</h5>

      <form @submit.prevent="submit">
        <!-- Email (view only) -->
        <div class="mb-3">
          <label>Email</label>
          <input v-model="user.email" class="form-control" disabled />
        </div>

        <!-- First Name -->
        <div class="mb-3">
          <label>First Name</label>
          <input v-model="user.firstName" class="form-control" />
        </div>

        <!-- Last Name -->
        <div class="mb-3">
          <label>Last Name</label>
          <input v-model="user.lastName" class="form-control" />
        </div>

        <!-- Phone -->
        <div class="mb-3">
          <label>Phone</label>
          <input v-model="user.phone" class="form-control" />
        </div>

        <!-- Avatar URL -->
        <div class="mb-3">
          <label>Avatar</label>
          <input
            type="file"
            class="form-control"
            accept="image/*"
            @change="onAvatarChange"
          />
        </div>

        <img
          v-if="previewAvatar"
          :src="previewAvatar"
          class="rounded mt-2"
          style="width: 120px; height: 120px; object-fit: cover"
        />

        <!-- Region (view only) -->
        <div class="mb-3">
          <label>Region</label>
          <input v-model="user.region" class="form-control" disabled />
        </div>

        <!-- Area (view only) -->
        <div class="mb-3">
          <label>Area</label>
          <input v-model="user.area" class="form-control" disabled />
        </div>

        <!-- Error -->
        <p class="text-danger mb-2" v-if="error">
          {{ error }}
        </p>

        <!-- Submit -->
        <button class="btn btn-primary w-100" :disabled="loading">
          {{ loading ? "Saving…" : "Save Changes" }}
        </button>
      </form>
    </div>
  </div>
</template>
