<script setup lang="ts">
definePageMeta({});

import { useListPagePermissions } from "@/composables/useListPagePermissions";
import { useRegionMasterApi } from "@/composables/useRegionMasterApi";
import {
  useRegionForm,
  REGION_TYPE_LABELS,
} from "@/composables/useRegionForm";
import FormShell from "@/components/form/FormShell.vue";
import FormSection from "@/components/form/FormSection.vue";

const route = useRoute();
const { canEdit } = useListPagePermissions("regions");
const { getRegionById } = useRegionMasterApi();

if (!canEdit.value) {
  navigateTo("/regions");
}

const id = route.query.id as string;
const original = await getRegionById(id);

const {
  form,
  parentOptions,
  parentsLoading,
  parentPlaceholder,
  showParent,
  loading,
  submitUpdate,
} = useRegionForm("update", {
  id: original.id,
  name: original.name,
  type: original.type,
  parentId: original.parentId,
});
</script>

<template>
  <FormShell
    title="Edit Region"
    :loading="loading"
    submit-label="Update"
    @submit="submitUpdate(id)"
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
