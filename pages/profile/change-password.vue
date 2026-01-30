<script setup lang="ts">
import { ref } from "vue";

const { changePassword } = useProfileApi();

const currentPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const show = ref(false);

const error = ref("");
const message = ref("");
const loading = ref(false);

const submit = async () => {
  error.value = "";
  message.value = "";

  if (newPassword.value !== confirmPassword.value) {
    error.value = "Password confirmation does not match";
    return;
  }

  loading.value = true;
  try {
    await changePassword({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    });

    message.value = "Password updated";
    currentPassword.value = newPassword.value = confirmPassword.value = "";
  } catch (e: any) {
    error.value = e?.data?.message || "Failed";
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
          />
        </div>

        <div class="mb-3 position-relative">
          <label>New Password</label>
          <input
            v-model="newPassword"
            :type="show ? 'text' : 'password'"
            class="form-control pe-5"
          />
        </div>

        <div class="mb-3 position-relative">
          <label>Confirm Password</label>
          <input
            v-model="confirmPassword"
            :type="show ? 'text' : 'password'"
            class="form-control pe-5"
          />

          <!-- GLOBAL TOGGLE -->
          <span
            class="password-toggle"
            @click="show = !show"
            :title="show ? 'Hide password' : 'Show password'"
          >
            {{ show ? "🙈" : "😶" }}
          </span>
        </div>

        <p class="text-danger mb-2" v-if="error">{{ error }}</p>
        <p class="text-success mb-2" v-if="message">{{ message }}</p>

        <button class="btn btn-primary w-100" :disabled="loading">
          {{ loading ? "Updating…" : "Update Password" }}
        </button>
      </form>
    </div>
  </div>
</template>
