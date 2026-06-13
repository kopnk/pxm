<script setup lang="ts">
import { computed } from "vue";
import {
  isExternalProjectFile,
  type ProjectFileItem,
} from "@/composables/useProjectFilesApi";

const props = defineProps<{
  url: string;
  selectedFileName?: string | null;
  existingFiles?: ProjectFileItem[];
  canDelete?: boolean;
  deletingId?: string | null;
}>();

const emit = defineEmits<{
  "update:url": [value: string];
  fileChange: [event: Event];
  delete: [id: string];
}>();

const urlFiles = computed(() =>
  (props.existingFiles ?? []).filter((file) => isExternalProjectFile(file)),
);

const uploadFiles = computed(() =>
  (props.existingFiles ?? []).filter((file) => !isExternalProjectFile(file)),
);

const onUrlInput = (event: Event) => {
  const value = (event.target as HTMLInputElement | null)?.value ?? "";
  emit("update:url", value);
};
</script>

<template>
  <td>
    <input
      :value="url"
      type="text"
      class="form-control form-control-sm"
      placeholder="https://drive.google.com/..."
      spellcheck="false"
      autocomplete="off"
      @input="onUrlInput"
    />
    <div
      v-for="file in urlFiles"
      :key="file.id"
      class="d-flex align-items-start justify-content-between gap-1 mt-1"
    >
      <div class="data-meta text-break user-select-all min-w-0">
        {{ file.fileUrl }}
      </div>
      <button
        v-if="canDelete"
        type="button"
        class="btn btn-sm btn-outline-danger px-1 py-0 flex-shrink-0"
        :disabled="deletingId === file.id"
        title="Delete document URL"
        @click="emit('delete', file.id)"
      >
        {{ deletingId === file.id ? "..." : "🗑" }}
      </button>
    </div>
  </td>
  <td>
    <input
      class="form-control form-control-sm"
      type="file"
      accept=".pdf,.png,.jpg,.jpeg"
      @change="emit('fileChange', $event)"
    />
    <div v-if="selectedFileName" class="data-meta mt-1">
      {{ selectedFileName }}
    </div>
    <div
      v-for="file in uploadFiles"
      :key="file.id"
      class="d-flex align-items-start justify-content-between gap-1 mt-1"
    >
      <div class="data-meta min-w-0">
        {{ file.fileName || "Uploaded file" }}
      </div>
      <button
        v-if="canDelete"
        type="button"
        class="btn btn-sm btn-outline-danger px-1 py-0 flex-shrink-0"
        :disabled="deletingId === file.id"
        title="Delete uploaded file"
        @click="emit('delete', file.id)"
      >
        {{ deletingId === file.id ? "..." : "🗑" }}
      </button>
    </div>
  </td>
</template>
