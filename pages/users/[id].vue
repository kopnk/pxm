<script setup>
definePageMeta({
  middleware: ["superadmin"],
});

import { useFormHandler } from "@/composables/useFormHandler";
import {
  toastSuccessDeleted,
  toastSuccessUpdated,
} from "@/composables/useToastMessages";
import FormShell from "@/components/form/FormShell.vue";
import FormSection from "@/components/form/FormSection.vue";

const route = useRoute();
const id = route.params.id;

const { data } = useApi(`/api/users/${id}`);
const { loading, handle } = useFormHandler();

/* ================= SAVE ================= */
const save = async () => {
  await handle(async () => {
    await useApi(`/api/users/${id}`, {
      method: "PUT",
      body: data.value,
    });
  }, toastSuccessUpdated("user"));
};

/* ================= DELETE ================= */
const remove = async () => {
  const confirmed = confirm("Delete user?");
  if (!confirmed) return;

  await handle(async () => {
    await useApi(`/api/users/${id}`, { method: "DELETE" });
    await navigateTo("/users");
  }, toastSuccessDeleted("user"));
};
</script>

<template>
  <FormShell
    title="Edit User"
    :loading="loading"
    submit-label="Save"
    @submit="save"
    @cancel="navigateTo('/users')"
  >
    <FormSection>
      <div class="col-12">
        <label>Role</label>
        <input v-model="data.role" class="form-control" />
      </div>

      <div class="col-12">
        <label>Status</label>
        <select v-model="data.is_active" class="form-select">
          <option :value="true">Active</option>
          <option :value="false">Inactive</option>
        </select>
      </div>
    </FormSection>

    <!-- DELETE BUTTON -->
    <div class="d-flex justify-content-end mt-3">
      <button class="btn btn-danger" type="button" @click="remove">
        Delete
      </button>
    </div>
  </FormShell>
</template>
