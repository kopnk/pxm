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
  <div v-if="totalPages > 1" class="btn-group btn-group-sm">
    <button
      type="button"
      class="btn btn-outline-secondary"
      :disabled="currentPage === 1"
      @click="$emit('prev')"
    >
      Prev
    </button>
    <span class="btn btn-outline-secondary disabled">
      Page {{ currentPage }} of {{ totalPages }}
    </span>
    <button
      type="button"
      class="btn btn-outline-secondary"
      :disabled="currentPage >= totalPages"
      @click="$emit('next')"
    >
      Next
    </button>
  </div>
</template>
