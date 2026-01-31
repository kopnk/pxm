<script setup lang="ts">
import { ref } from "vue";

const { changePassword } = useProfileApi();
const { logout } = useAppLogout();

const currentPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const show = ref(false);

const loading = ref(false);
const error = ref<string | null>(null);
const message = ref<string | null>(null);

const resetForm = () => {
  currentPassword.value = "";
  newPassword.value = "";
  confirmPassword.value = "";
};

const submit = async () => {
  error.value = null;
  message.value = null;

  // FE validation only
  if (newPassword.value !== confirmPassword.value) {
    error.value = "Password confirmation does not match";
    return;
  }

  loading.value = true;

  try {
    await changePassword({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
      confirmPassword: confirmPassword.value,
    });

    // backend sudah invalidate semua session
    message.value = "Password updated. Please login again.";
    resetForm();

    // kasih jeda biar user baca message
    setTimeout(async () => {
      await logout(); // 🔥 SATU PINTU LOGOUT
    }, 1200);
  } catch (e: any) {
    error.value = e.message || "Change password failed";
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="card">
    <div class="card-body">
      <h5 class="mb-4">Change Password</h5>

      <form @submit.prevent="submit">
        <div class="mb-3 position-relative">
          <label>Current Password</label>
          <input
            v-model="currentPassword"
            :type="show ? 'text' : 'password'"
            class="form-control pe-5"
            required
          />
        </div>

        <div class="mb-3 position-relative">
          <label>New Password</label>
          <input
            v-model="newPassword"
            :type="show ? 'text' : 'password'"
            class="form-control pe-5"
            required
            minlength="8"
          />
        </div>

        <div class="mb-3 position-relative">
          <label>Confirm Password</label>
          <input
            v-model="confirmPassword"
            :type="show ? 'text' : 'password'"
            class="form-control pe-5"
            required
          />

          <span
            class="password-toggle"
            @click="show = !show"
            :title="show ? 'Hide password' : 'Show password'"
          >
            {{ show ? "🙈" : "😶" }}
          </span>
        </div>

        <p v-if="error" class="text-danger mb-2">{{ error }}</p>
        <p v-if="message" class="text-success mb-2">{{ message }}</p>

        <button class="btn btn-primary w-100" :disabled="loading">
          {{ loading ? "Updating…" : "Update Password" }}
        </button>
      </form>
    </div>
  </div>
</template>
