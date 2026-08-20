<script setup lang="ts">
import { useNotificationStore } from "@/stores/notifications";

const store = useNotificationStore();
</script>

<template>
  <div
    v-if="store.visible"
    class="position-fixed bottom-0 end-0 p-3"
    style="z-index: 9999"
  >
    <div
      class="toast show align-items-center text-white border-0 shadow"
      :class="`bg-${store.type}`"
    >
      <div class="d-flex">
        <div class="toast-body">
          {{ store.message }}
        </div>
        <button
          type="button"
          class="btn-close btn-close-white me-2 m-auto"
          @click="store.hide"
        ></button>
      </div>
    </div>
  </div>
</template>
