<script setup lang="ts">
definePageMeta({});

import { useAuthStore } from "@/stores/auth";
import { useUserSignupForm } from "@/composables/useUserSignupForm";
import FormShell from "@/components/form/FormShell.vue";
import FormSection from "@/components/form/FormSection.vue";

const authStore = useAuthStore();

if (!authStore.canAccess("users", "create")) {
  navigateTo("/users");
}

const {
  user,
  regions,
  areas,
  selectedRegionId,
  selectedAreaId,
  regionsLoading,
  areasLoading,
  loading,
  creatableRoles,
  temporaryPassword,
  submit,
  closeTemporaryPassword,
} = useUserSignupForm();
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
        <label class="label-field d-block mb-1">Email</label>
        <input
          v-model="user.email"
          type="email"
          class="form-control"
          placeholder="user@example.com"
          required
        />
      </div>

      <div class="col-12">
        <p class="data-meta mb-0">
          A unique temporary password will be generated. The user must change it on first login.
        </p>
      </div>

      <div class="col-6">
        <label class="label-field d-block mb-1">First Name</label>
        <input
          v-model="user.firstName"
          class="form-control"
          required
        />
      </div>

      <div class="col-6">
        <label class="label-field d-block mb-1">Last Name</label>
        <input
          v-model="user.lastName"
          class="form-control"
          required
        />
      </div>

      <div class="col-6">
        <label class="label-field d-block mb-1">Phone</label>
        <input
          v-model="user.phone"
          type="tel"
          class="form-control"
          placeholder="08xxxxxxxxxx"
          inputmode="numeric"
          pattern="08[0-9]{8,13}"
          minlength="10"
          maxlength="15"
          required
        />
        <div class="data-meta mt-1">Starts with 08, 10–15 digits</div>
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
            {{ regionsLoading ? "Loading…" : "Select region" }}
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
                  ? "Loading…"
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
        <select v-model="user.role" class="form-select">
          <option
            v-for="role in creatableRoles"
            :key="role"
            :value="role"
          >
            {{ role.charAt(0).toUpperCase() + role.slice(1) }}
          </option>
        </select>
      </div>

      <div class="col-6">
        <label class="label-field d-block mb-1">Status</label>
        <select v-model="user.isActive" class="form-select">
          <option :value="true">Active</option>
          <option :value="false">Inactive</option>
        </select>
      </div>

      <div class="col-6">
        <label class="label-field d-block mb-1">Avatar URL</label>
        <input v-model="user.avatarUrl" class="form-control" />
      </div>
    </FormSection>
  </FormShell>

  <TemporaryPasswordDialog
    :visible="Boolean(temporaryPassword)"
    :password="temporaryPassword"
    title="User created"
    @close="closeTemporaryPassword"
  />
</template>
