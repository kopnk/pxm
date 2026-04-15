<script setup lang="ts">
defineProps<{
  title?: string;
}>();
</script>

<template>
  <div class="card border-0 shadow-sm mb-4">
    <div class="card-body">
      <h6 v-if="title" class="text-muted mb-3">
        {{ title }}
      </h6>

      <div class="row g-3">
        <slot />
      </div>
    </div>
  </div>
</template>
