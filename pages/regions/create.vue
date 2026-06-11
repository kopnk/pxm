<script setup lang="ts">
definePageMeta({});

import { useListPagePermissions } from "@/composables/useListPagePermissions";
import {
  useRegionForm,
  REGION_TYPE_LABELS,
} from "@/composables/useRegionForm";
import FormShell from "@/components/form/FormShell.vue";
import FormSection from "@/components/form/FormSection.vue";

const { canCreate } = useListPagePermissions("regions");

if (!canCreate.value) {
  navigateTo("/regions");
}

const {
  form,
  parentOptions,
  parentsLoading,
  parentPlaceholder,
  showParent,
  loading,
  submitCreate,
} = useRegionForm("create");
</script>

<template>
  <FormShell
    title="Create Region"
    :loading="loading"
    submit-label="Create"
    @submit="submitCreate"
    @cancel="navigateTo('/regions')"
  >
    <FormSection>
      <div class="col-md-6">
        <label class="label-field d-block mb-1">Name</label>
        <input v-model="form.name" class="form-control" required />
      </div>

      <div class="col-md-6">
        <label class="label-field d-block mb-1">Type</label>
        <select v-model="form.type" class="form-select" required>
          <option
            v-for="(label, key) in REGION_TYPE_LABELS"
            :key="key"
            :value="key"
          >
            {{ label }}
          </option>
        </select>
      </div>

      <div v-if="showParent" class="col-md-6">
        <label class="label-field d-block mb-1">Parent</label>
        <select
          :key="form.type"
          v-model="form.parentId"
          class="form-select"
          :disabled="parentsLoading || !parentOptions.length"
          :required="parentOptions.length > 0"
        >
          <option value="" disabled>
            {{ parentPlaceholder }}
          </option>
          <option
            v-for="parent in parentOptions"
            :key="parent.id"
            :value="parent.id"
          >
            {{ parent.name }}
          </option>
        </select>
      </div>
    </FormSection>
  </FormShell>
</template>
