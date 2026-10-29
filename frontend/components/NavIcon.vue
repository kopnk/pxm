<script setup lang="ts">
import { NAV_ICON_PATHS, type NavIconName } from "~/lib/navIcons";

const props = defineProps<{
  name: NavIconName;
  size?: number;
}>();

const paths = computed(() => NAV_ICON_PATHS[props.name] ?? []);
</script>

<template>
  <svg
    class="nav-icon"
    viewBox="0 0 24 24"
    :width="size ?? 20"
    :height="size ?? 20"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path v-for="(d, index) in paths" :key="index" :d="d" />
  </svg>
</template>

<style scoped>
.nav-icon {
  flex-shrink: 0;
}
</style>
