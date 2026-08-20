<script setup lang="ts">
import { formatListTimestamp } from "@/utils/formatListTimestamp";

defineProps<{
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}>();
</script>

<template>
  <div class="data-meta mt-1">
    <div>Created: {{ createdBy || "-" }} - {{ formatListTimestamp(createdAt) }}</div>
    <div>Updated: {{ updatedBy || "-" }} - {{ formatListTimestamp(updatedAt) }}</div>
  </div>
</template>
