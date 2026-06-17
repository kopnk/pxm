<script setup lang="ts">
import {
  isExternalProjectFile,
  type ProjectFileItem,
} from "@/composables/useProjectFilesApi";

defineProps<{
  files: ProjectFileItem[];
  canDelete?: boolean;
  deletingId?: string | null;
}>();

defineEmits<{
  delete: [id: string];
}>();
</script>

<template>
  <div v-if="files.length" class="col-12">
    <div class="d-flex flex-column gap-1 mb-2">
      <div
        v-for="file in files"
        :key="file.id"
        class="d-flex align-items-start justify-content-between gap-2"
      >
        <div class="flex-grow-1 min-w-0">
          <div
            v-if="!isExternalProjectFile(file)"
            class="data-value"
            style="font-size: 0.95rem"
          >
            <a
              v-if="file.signedUrl"
              :href="file.signedUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="text-decoration-none"
            >
              {{ file.fileName || "Uploaded file" }}
            </a>
            <span v-else>{{ file.fileName || "Uploaded file" }}</span>
          </div>
          <template v-else>
            <div class="data-label">Document URL</div>
            <div class="data-meta text-break user-select-all">
              {{ file.fileUrl }}
            </div>
          </template>
        </div>
        <button
          v-if="canDelete"
          type="button"
          class="btn btn-sm btn-outline-danger px-2 py-0 flex-shrink-0"
          :disabled="deletingId === file.id"
          title="Delete document"
          @click="$emit('delete', file.id)"
        >
          {{ deletingId === file.id ? "..." : "🗑" }}
        </button>
      </div>
    </div>
  </div>
</template>
