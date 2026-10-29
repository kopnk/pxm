<script setup lang="ts">
defineProps<{
  currentPage: number;
  totalPages: number;
}>();

defineEmits<{
  prev: [];
  next: [];
}>();
</script>

<template>
  <nav v-if="totalPages > 1" class="pxm-pagination" aria-label="Pagination">
    <button
      type="button"
      class="btn btn-sm btn-outline-secondary"
      :disabled="currentPage === 1"
      aria-label="Previous page"
      @click="$emit('prev')"
    >
      <span aria-hidden="true">‹</span>
      <span class="pxm-pagination-text">Prev</span>
    </button>
    <span class="pxm-pagination-status" aria-live="polite" aria-atomic="true">
      Page <strong>{{ currentPage }}</strong> of {{ totalPages }}
    </span>
    <button
      type="button"
      class="btn btn-sm btn-outline-secondary"
      :disabled="currentPage >= totalPages"
      aria-label="Next page"
      @click="$emit('next')"
    >
      <span class="pxm-pagination-text">Next</span>
      <span aria-hidden="true">›</span>
    </button>
  </nav>
</template>
