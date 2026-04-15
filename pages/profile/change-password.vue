<script setup lang="ts">
import { ref } from "vue";
import { useFormHandler } from "@/composables/useFormHandler";
import { toastPasswordChangedSignInAgain } from "@/composables/useToastMessages";
import FormShell from "@/components/form/FormShell.vue";
import FormSection from "@/components/form/FormSection.vue";

const { changePassword } = useProfileApi();
const { logout } = useAppLogout();
const { loading, handle } = useFormHandler();

const currentPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const show = ref(false);

const resetForm = () => {
  currentPassword.value = "";
  newPassword.value = "";
  confirmPassword.value = "";
};

const submit = async () => {
  // FE validation tetap sama
  if (newPassword.value !== confirmPassword.value) {
    throw new Error("Password confirmation does not match");
  }

  await handle(async () => {
    await changePassword({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
      confirmPassword: confirmPassword.value,
    });

    resetForm();

    // tetap kasih delay sebelum logout (logic sama)
    setTimeout(async () => {
      await logout();
    }, 1200);
  }, toastPasswordChangedSignInAgain());
};
</script>

<template>
  <FormShell
    title="Change Password"
    :loading="loading"
    submit-label="Update"
    @submit="submit"
    @cancel="resetForm"
  >
    <FormSection>
      <div class="col-12 position-relative">
        <label>Current Password</label>
        <input
          v-model="currentPassword"
          :type="show ? 'text' : 'password'"
          class="form-control"
          required
        />
      </div>

      <div class="col-12 position-relative">
        <label>New Password</label>
        <input
          v-model="newPassword"
          :type="show ? 'text' : 'password'"
          class="form-control"
          required
          minlength="8"
        />
      </div>

      <div class="col-12 position-relative">
        <label>Confirm Password</label>
        <input
          v-model="confirmPassword"
          :type="show ? 'text' : 'password'"
          class="form-control"
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
    </FormSection>
  </FormShell>
</template>
