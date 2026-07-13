<script setup lang="ts">
import { computed, ref } from "vue";
import { useFormHandler } from "@/composables/useFormHandler";
import { toastPasswordChangedSignInAgain } from "@/composables/useToastMessages";
import FormShell from "@/components/form/FormShell.vue";
import FormSection from "@/components/form/FormSection.vue";
import { sessionExpiredSignInAgainMessage } from "~/lib/entityMessages";
import {
  getPasswordRuleErrors,
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULES,
} from "~/lib/passwordPolicy";

const { changePassword } = useProfileApi();
const { logout } = useAppLogout();
const auth = useAuthStore();
const { loading, handle } = useFormHandler();
const router = useRouter();

const mustChangePassword = computed(() =>
  Boolean(auth.user?.mustChangePassword),
);

const currentPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const show = ref(false);

const passwordRuleStates = computed(() =>
  PASSWORD_RULES.map((rule) => ({
    key: rule.key,
    label: rule.label,
    valid: rule.test(newPassword.value),
  })),
);

const resetForm = () => {
  currentPassword.value = "";
  newPassword.value = "";
  confirmPassword.value = "";
};

const isUnauthorizedError = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const statusCode =
    "statusCode" in error && typeof error.statusCode === "number"
      ? error.statusCode
      : "data" in error &&
          error.data &&
          typeof error.data === "object" &&
          "statusCode" in error.data &&
          typeof error.data.statusCode === "number"
        ? error.data.statusCode
        : "response" in error &&
            error.response &&
            typeof error.response === "object" &&
            "status" in error.response &&
            typeof error.response.status === "number"
          ? error.response.status
          : 0;

  return statusCode === 401;
};

const ensureActiveSession = async () => {
  await auth.refreshSession();

  if (!auth.user) {
    await logout();
    throw new Error(sessionExpiredSignInAgainMessage());
  }
};

const onCancel = () => {
  if (mustChangePassword.value) return;
  void router.replace("/profile");
};

const submit = async () => {
  try {
    await handle(async () => {
      const passwordErrors = getPasswordRuleErrors(newPassword.value);

      if (passwordErrors.length > 0) {
        throw new Error(`Password must include: ${passwordErrors.join(", ")}`);
      }

      if (newPassword.value !== confirmPassword.value) {
        throw new Error("Password confirmation does not match");
      }

      await ensureActiveSession();

      try {
        await changePassword({
          currentPassword: mustChangePassword.value
            ? undefined
            : currentPassword.value,
          newPassword: newPassword.value,
          confirmPassword: confirmPassword.value,
        });
      } catch (error) {
        if (isUnauthorizedError(error)) {
          await logout();
          throw new Error(sessionExpiredSignInAgainMessage());
        }

        throw error;
      }

      resetForm();

      // tetap kasih delay sebelum logout (logic sama)
      setTimeout(async () => {
        await logout();
      }, 1200);
    }, toastPasswordChangedSignInAgain());
  } catch {
    // Toast error sudah ditangani di useFormHandler.
  }
};
</script>

<template>
  <FormShell
    :title="mustChangePassword ? 'Set New Password' : 'Change Password'"
    :loading="loading"
    submit-label="Update"
    @submit="submit"
    @cancel="onCancel"
  >
    <FormSection>
      <div v-if="mustChangePassword" class="col-12">
        <p class="data-meta mb-0">
          Your password was reset to the default. Please set a new password
          before continuing.
        </p>
      </div>

      <div v-if="!mustChangePassword" class="col-12 position-relative">
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
          :minlength="PASSWORD_MIN_LENGTH"
        />
        <div class="data-meta mt-2">
          <div class="label-field mb-1">Password rules</div>
          <ul class="mb-0 ps-3">
            <li
              v-for="rule in passwordRuleStates"
              :key="rule.key"
              :class="rule.valid ? 'text-success' : ''"
            >
              <span class="fw-semibold">
                {{ rule.valid ? "OK" : "Required" }}
              </span>
              - {{ rule.label }}
            </li>
          </ul>
        </div>
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
