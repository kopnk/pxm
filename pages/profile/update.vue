<script setup lang="ts">
const router = useRouter();
const profileStore = useProfileStore();

// pastikan profile sudah tersedia (cached di store)
await profileStore.fetchProfile();

// clone supaya form tidak mutate store langsung
const user = reactive({ ...profileStore.profile! });

const error = ref("");
const loading = ref(false);

const submit = async () => {
  error.value = "";
  loading.value = true;

  try {
    // payload dasar (sesuai business rule)
    const payload: Record<string, any> = {
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
    };

    // 🔹 PLAN B: avatar URL opsional
    if (user.avatarUrl && user.avatarUrl !== profileStore.profile?.avatarUrl) {
      payload.avatarUrl = user.avatarUrl;
    }

    // call API
    await $fetch("/api/profile", {
      method: "PUT",
      credentials: "include",
      body: payload,
    });

    // sync ke profile store (single source of truth)
    profileStore.updateProfile(payload);

    // redirect setelah sukses
    await router.replace("/profile");
  } catch (e: any) {
    error.value = e?.data?.message || "Update failed";
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

        <!-- Avatar URL (Plan B) -->
        <div class="mb-4">
          <label>Avatar URL</label>
          <input
            v-model="user.avatarUrl"
            class="form-control"
            placeholder="https://example.com/avatar.png"
          />
          <small class="text-muted">
            Optional. Kosongkan jika tidak ingin mengubah avatar.
          </small>
        </div>

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

        <!-- Role (view only) -->
        <div class="mb-3">
          <label>Role</label>
          <input v-model="user.role" class="form-control" disabled />
        </div>

        <!-- Error -->
        <p class="text-danger mb-2" v-if="error">{{ error }}</p>

        <!-- Submit -->
        <button class="btn btn-primary w-100" :disabled="loading">
          {{ loading ? "Saving…" : "Save Changes" }}
        </button>
      </form>
    </div>
  </div>
</template>
