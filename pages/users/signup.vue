<script setup lang="ts">
definePageMeta({
  middleware: ["superadmin"],
});

import { reactive } from "vue";
import { useFormHandler } from "@/composables/useFormHandler";
import { toastSuccessCreated } from "@/composables/useToastMessages";
import FormShell from "@/components/form/FormShell.vue";
import FormSection from "@/components/form/FormSection.vue";

const authStore = useAuthStore();
const { signupUser } = useUsersApi();
const { loading, handle } = useFormHandler();

/**
 * 🔐 FE Guard (TIDAK DIUBAH)
 */
if (authStore.user?.role !== "superadmin") {
  console.warn("[SIGNUP] Forbidden role:", authStore.user?.role);
  navigateTo("/users");
}

/**
 * Form state (TETAP SAMA)
 */
const user = reactive({
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  phone: "",
  region: "",
  area: "",
  role: "staff",
  isActive: true,
  avatarUrl: "http://profile/update",
});

/**
 * Submit signup (LOGIC SAMA)
 */
const submit = async () => {
  console.log("🟡 [SIGNUP] Submit clicked");
  console.log("🟡 [SIGNUP] Payload:", JSON.parse(JSON.stringify(user)));

  await handle(async () => {
    try {
      console.log("🟠 [SIGNUP] Calling API...");
      await signupUser({
        email: user.email,
        password: user.password,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        region: user.region,
        area: user.area,
        role: user.role,
        isActive: user.isActive,
        avatarUrl: user.avatarUrl,
      });

      console.log("🟢 [SIGNUP] Success → redirect");
      await navigateTo("/users");
    } catch (err: any) {
      console.error("🔴 [SIGNUP] Failed:", err);

      // 🔥 ZOD VALIDATION ERROR (LOGIC TETAP)
      if (err?.data?.data?.fieldErrors) {
        const fieldErrors = err.data.data.fieldErrors;

        if (fieldErrors.avatarUrl) {
          throw new Error("Invalid avatar URL");
        }

        if (fieldErrors.email) {
          throw new Error("Invalid email");
        }

        if (fieldErrors.password) {
          throw new Error("Invalid password");
        }

        throw new Error("Data input is invalid");
      }

      throw new Error(
        err?.data?.message ?? err?.message ?? "Signup failed, check console",
      );
    }
  }, toastSuccessCreated("user"));
};
</script>

<template>
  <FormShell
    title="Signup User"
    :loading="loading"
    submit-label="Create"
    @submit="submit"
    @cancel="navigateTo('/users')"
  >
    <FormSection>
      <div class="col-12">
        <label>Email</label>
        <input class="form-control" v-model="user.email" />
      </div>

      <div class="col-12">
        <label>Password</label>
        <input type="password" class="form-control" v-model="user.password" />
      </div>

      <div class="col-6">
        <label>First Name</label>
        <input class="form-control" v-model="user.firstName" />
      </div>

      <div class="col-6">
        <label>Last Name</label>
        <input class="form-control" v-model="user.lastName" />
      </div>

      <div class="col-6">
        <label>Phone</label>
        <input class="form-control" v-model="user.phone" />
      </div>

      <div class="col-6">
        <label>Region</label>
        <input class="form-control" v-model="user.region" />
      </div>

      <div class="col-6">
        <label>Area</label>
        <input class="form-control" v-model="user.area" />
      </div>

      <div class="col-6">
        <label>Role</label>
        <select class="form-select" v-model="user.role">
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
          <option value="superadmin">Superadmin</option>
        </select>
      </div>

      <div class="col-6">
        <label>Status</label>
        <select class="form-select" v-model="user.isActive">
          <option :value="true">Active</option>
          <option :value="false">Inactive</option>
        </select>
      </div>

      <div class="col-6">
        <label>Avatar URL</label>
        <input class="form-control" v-model="user.avatarUrl" />
      </div>
    </FormSection>
  </FormShell>
</template>
