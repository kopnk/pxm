<script setup lang="ts">
definePageMeta({
  middleware: ["superadmin"],
});
import { reactive, computed } from "vue";

const route = useRoute();
const authStore = useAuthStore();
const { getUserById, updateUser } = useUsersApi();

/**
 * 🔐 FE Guard
 * kalau bukan superadmin → tendang
 */
if (authStore.user?.role !== "superadmin") {
  navigateTo("/users");
}

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
 * Payload update
 * ❗ field read-only TIDAK dikirim
 */
const submit = async () => {
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

  navigateTo("/users");
};
</script>

<template>
  <div class="container mt-3">
    <h3>Edit User</h3>

    <!-- READ ONLY -->
    <div class="mb-2">
      <label>Email</label>
      <input class="form-control" :value="user.email" disabled />
    </div>

    <!-- EDITABLE -->
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

    <!-- ROLE (superadmin only) -->
    <div class="mb-2">
      <label>Role</label>
      <select class="form-select" v-model="user.role">
        <option value="staff">Staff</option>
        <option value="admin">Admin</option>
        <option value="superadmin">Superadmin</option>
      </select>
    </div>

    <div class="mb-2">
      <label>Active</label>
      <select class="form-select" v-model="user.isActive">
        <option :value="true">Active</option>
        <option :value="false">Inactive</option>
      </select>
    </div>

    <div class="mb-2">
      <label>Avatar URL</label>
      <input class="form-control" v-model="user.avatarUrl" />
    </div>

    <!-- READ ONLY META -->
    <hr />

    <div class="mb-2">
      <label>Last Login At</label>
      <input class="form-control" :value="user.lastLoginAt" disabled />
    </div>

    <div class="mb-2">
      <label>Created At</label>
      <input class="form-control" :value="user.createdAt" disabled />
    </div>

    <div class="mb-2">
      <label>Updated At</label>
      <input class="form-control" :value="user.updatedAt" disabled />
    </div>

    <button class="btn btn-primary w-100" @click="submit">Update User</button>
  </div>
</template>
