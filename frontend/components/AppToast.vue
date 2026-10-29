<script setup lang="ts">
import { useNotificationStore } from "@/stores/notifications";

const store = useNotificationStore();
const isError = computed(() => store.type === "danger" || store.type === "warning");
</script>

<template>
  <div class="app-toast-region" :role="isError ? 'alert' : 'status'" aria-live="polite">
    <Transition name="app-toast">
      <div v-if="store.visible" class="app-toast" :class="`app-toast-${store.type}`">
        <span class="app-toast-bar" aria-hidden="true" />
        <p class="app-toast-message">{{ store.message }}</p>
        <button
          type="button"
          class="btn-close"
          aria-label="Dismiss notification"
          @click="store.hide"
        />
      </div>
    </Transition>
  </div>
</template>
