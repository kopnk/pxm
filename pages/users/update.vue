<script setup lang="ts">
definePageMeta({
  middleware: ["superadmin"],
});

import { reactive } from "vue";
import { useFormHandler } from "@/composables/useFormHandler";
import { toastSuccessUpdated } from "@/composables/useToastMessages";
import FormShell from "@/components/form/FormShell.vue";
import FormSection from "@/components/form/FormSection.vue";

const route = useRoute();
const authStore = useAuthStore();
const { getUserById, updateUser } = useUsersApi();
const { loading, handle } = useFormHandler();

/**
 * 🔐 FE Guard (TIDAK DIUBAH)
 */
if (authStore.user?.role !== "superadmin") {
  navigateTo("/users");
}

/**
 * Fetch original user (LOGIC SAMA)
 */
const originalUser = await getUserById(route.query.id as string);

/**
 * Clone supaya tidak mutate data asli
 */
const user = reactive({
  id: originalUser.id,
  email: originalUser.email,
  firstName: originalUser.firstName,
  lastName: originalUser.lastName,
  phone: originalUser.phone,
  region: originalUser.region,
  area: originalUser.area,
  role: originalUser.role,
  isActive: originalUser.isActive,
  avatarUrl: originalUser.avatarUrl,
  lastLoginAt: originalUser.lastLoginAt,
  createdAt: originalUser.createdAt,
  updatedAt: originalUser.updatedAt,
});

/**
 * Submit (LOGIC PAYLOAD TETAP)
 */
const submit = async () => {
  await handle(async () => {
    await updateUser(user.id, {
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      region: user.region,
      area: user.area,
      role: user.role,
      isActive: user.isActive,
      avatarUrl: user.avatarUrl,
    });

    await navigateTo("/users");
  }, toastSuccessUpdated("user"));
};
</script>

<template>
  <FormShell
    title="Edit User"
    :loading="loading"
    submit-label="Update"
    @submit="submit"
    @cancel="navigateTo('/users')"
  >
    <FormSection>
      <!-- READ ONLY -->
      <div class="col-12">
        <label>Email</label>
        <input class="form-control" :value="user.email" disabled />
      </div>

      <!-- EDITABLE -->
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
        <label>Active</label>
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

    <!-- READ ONLY META -->
    <FormSection title="Metadata">
      <div class="col-6">
        <label>Last Login At</label>
        <input class="form-control" :value="user.lastLoginAt" disabled />
      </div>

      <div class="col-6">
        <label>Created At</label>
        <input class="form-control" :value="user.createdAt" disabled />
      </div>

      <div class="col-6">
        <label>Updated At</label>
        <input class="form-control" :value="user.updatedAt" disabled />
      </div>
    </FormSection>
  </FormShell>
</template>
