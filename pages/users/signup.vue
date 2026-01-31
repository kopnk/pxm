<script setup lang="ts">
definePageMeta({
  middleware: ["superadmin"],
});
import { reactive, ref } from "vue";

const authStore = useAuthStore();
const { signupUser } = useUsersApi();

const loading = ref(false);
const errorMessage = ref<string | null>(null);

/**
 * 🔐 FE Guard
 */
if (authStore.user?.role !== "superadmin") {
  console.warn("[SIGNUP] Forbidden role:", authStore.user?.role);
  navigateTo("/users");
}

/**
 * Form state
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
 * Submit signup
 */
const submit = async () => {
  console.log("🟡 [SIGNUP] Submit clicked");
  console.log("🟡 [SIGNUP] Payload:", JSON.parse(JSON.stringify(user)));

  errorMessage.value = null;
  loading.value = true;

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
    navigateTo("/users");
  } catch (err: any) {
    console.error("🔴 [SIGNUP] Failed:", err);

    // 🔥 ZOD VALIDATION ERROR
    if (err?.data?.data?.fieldErrors) {
      const fieldErrors = err.data.data.fieldErrors;

      if (fieldErrors.avatarUrl) {
        errorMessage.value = "Invalid avatar URL";
        return;
      }

      if (fieldErrors.email) {
        errorMessage.value = "Invalid email";
        return;
      }

      if (fieldErrors.password) {
        errorMessage.value = "Invalid password";
        return;
      }

      errorMessage.value = "Data input is invalid";
      return;
    }

    errorMessage.value =
      err?.data?.message ?? err?.message ?? "Signup failed, check console";
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="container mt-3" style="max-width: 600px">
    <h3>Signup User</h3>

    <div v-if="errorMessage" class="alert alert-danger">
      {{ errorMessage }}
    </div>

    <div class="mb-2">
      <label>Email</label>
      <input class="form-control" v-model="user.email" />
    </div>

    <div class="mb-2">
      <label>Password</label>
      <input type="password" class="form-control" v-model="user.password" />
    </div>

    <div class="mb-2">
      <label>First Name</label>
      <input class="form-control" v-model="user.firstName" />
    </div>

    <div class="mb-2">
      <label>Last Name</label>
      <input class="form-control" v-model="user.lastName" />
    </div>

    <div class="mb-2">
      <label>Phone</label>
      <input class="form-control" v-model="user.phone" />
    </div>

    <div class="mb-2">
      <label>Region</label>
      <input class="form-control" v-model="user.region" />
    </div>

    <div class="mb-2">
      <label>Area</label>
      <input class="form-control" v-model="user.area" />
    </div>

    <div class="mb-2">
      <label>Role</label>
      <select class="form-select" v-model="user.role">
        <option value="staff">Staff</option>
        <option value="admin">Admin</option>
        <option value="superadmin">Superadmin</option>
      </select>
    </div>

    <div class="mb-2">
      <label>Status</label>
      <select class="form-select" v-model="user.isActive">
        <option :value="true">Active</option>
        <option :value="false">Inactive</option>
      </select>
    </div>

    <div class="mb-2">
      <label>Avatar URL</label>
      <input class="form-control" v-model="user.avatarUrl" />
    </div>

    <button class="btn btn-success w-100" :disabled="loading" @click="submit">
      {{ loading ? "Creating..." : "Create User" }}
    </button>
  </div>
</template>
