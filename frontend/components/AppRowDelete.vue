<script setup lang="ts">
withDefaults(
  defineProps<{
    busy?: boolean;
    label?: string;
  }>(),
  { busy: false, label: "Delete" },
);

defineEmits<{ delete: [] }>();
</script>

<template>
  <button
    type="button"
    class="pxm-row-delete"
    :disabled="busy"
    :aria-label="label"
    :title="label"
    @click.stop="$emit('delete')"
  >
    <span v-if="busy" class="spinner-border spinner-border-sm" aria-hidden="true" />
    <svg v-else viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6.5 1h3a1 1 0 0 1 1 1v1H13a.5.5 0 0 1 0 1h-.54l-.7 9.1A2 2 0 0 1 9.77 15H6.23a2 2 0 0 1-1.99-1.9L3.54 4H3a.5.5 0 0 1 0-1h2.5V2a1 1 0 0 1 1-1Zm0 2h3V2h-3v1ZM4.55 4l.69 9.02a1 1 0 0 0 1 .98h3.53a1 1 0 0 0 1-.98L11.45 4h-6.9ZM6.5 5.5a.5.5 0 0 1 .5.5v5.5a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Zm3 0a.5.5 0 0 1 .5.5v5.5a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Z"
      />
    </svg>
  </button>
</template>
