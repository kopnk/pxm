<script setup lang="ts">
definePageMeta({});

import { useAuthStore } from "@/stores/auth";
import { useUserUpdateForm } from "@/composables/useUserUpdateForm";
import { formatListTimestamp } from "@/utils/formatListTimestamp";
import FormShell from "@/components/form/FormShell.vue";
import FormSection from "@/components/form/FormSection.vue";

const route = useRoute();
const authStore = useAuthStore();
const { getUserById } = useUsersApi();

if (!authStore.canAccess("users", "update")) {
  navigateTo("/users");
}

const originalUser = await getUserById(route.query.id as string);

const {
  user,
  regions,
  areas,
  selectedRegionId,
  selectedAreaId,
  regionsLoading,
  areasLoading,
  editableRoles,
  canEditRole,
  canEditStatus,
  loading,
  submit,
} = useUserUpdateForm(originalUser);
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
      <div class="col-12">
        <label class="label-field d-block mb-1">Email</label>
        <input class="form-control" :value="user.email" disabled />
      </div>

      <div class="col-6">
        <label class="label-field d-block mb-1">First Name</label>
        <input v-model="user.firstName" class="form-control" required />
      </div>

      <div class="col-6">
        <label class="label-field d-block mb-1">Last Name</label>
        <input v-model="user.lastName" class="form-control" required />
      </div>

      <div class="col-6">
        <label class="label-field d-block mb-1">Phone</label>
        <input v-model="user.phone" class="form-control" />
      </div>

      <div class="col-6">
        <label class="label-field d-block mb-1">Region</label>
        <select
          v-model="selectedRegionId"
          class="form-select"
          :disabled="regionsLoading"
          required
        >
          <option value="" disabled>
            {{ regionsLoading ? "Loading..." : "Select region" }}
          </option>
          <option
            v-for="region in regions"
            :key="region.id"
            :value="region.id"
          >
            {{ region.name }}
          </option>
        </select>
      </div>

      <div class="col-6">
        <label class="label-field d-block mb-1">Area</label>
        <select
          v-model="selectedAreaId"
          class="form-select"
          :disabled="!selectedRegionId || areasLoading"
          required
        >
          <option value="" disabled>
            {{
              !selectedRegionId
                ? "Select region first"
                : areasLoading
                  ? "Loading..."
                  : areas.length
                    ? "Select area"
                    : "No area available"
            }}
          </option>
          <option v-for="area in areas" :key="area.id" :value="area.id">
            {{ area.name }}
          </option>
        </select>
      </div>

      <div class="col-6">
        <label class="label-field d-block mb-1">Role</label>
        <select
          v-if="canEditRole"
          v-model="user.role"
          class="form-select"
        >
          <option
            v-for="role in editableRoles"
            :key="role"
            :value="role"
          >
            {{ role.charAt(0).toUpperCase() + role.slice(1) }}
          </option>
        </select>
        <input
          v-else
          class="form-control"
          :value="user.role"
          disabled
        />
      </div>

      <div class="col-6">
        <label class="label-field d-block mb-1">Active</label>
        <select
          v-if="canEditStatus"
          v-model="user.isActive"
          class="form-select"
        >
          <option :value="true">Active</option>
          <option :value="false">Inactive</option>
        </select>
        <input
          v-else
          class="form-control"
          :value="user.isActive ? 'Active' : 'Inactive'"
          disabled
        />
      </div>

      <div class="col-6">
        <label class="label-field d-block mb-1">Avatar URL</label>
        <input v-model="user.avatarUrl" class="form-control" />
      </div>
    </FormSection>

    <FormSection title="Metadata">
      <div class="col-6">
        <label class="label-field d-block mb-1">Last Login At</label>
        <input
          class="form-control"
          :value="formatListTimestamp(user.lastLoginAt)"
          disabled
        />
      </div>

      <div class="col-6">
        <label class="label-field d-block mb-1">Created At</label>
        <input
          class="form-control"
          :value="formatListTimestamp(user.createdAt)"
          disabled
        />
      </div>

      <div class="col-6">
        <label class="label-field d-block mb-1">Updated At</label>
        <input
          class="form-control"
          :value="formatListTimestamp(user.updatedAt)"
          disabled
        />
      </div>
    </FormSection>
  </FormShell>
</template>
