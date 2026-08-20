<script setup lang="ts">
const props = defineProps<{
  name: string;
}>();

const maskUrl = computed(() => `/icon/${props.name}.svg`);
</script>

<template>
  <span
    class="nav-icon"
    :style="{
      WebkitMaskImage: `url(${maskUrl})`,
      maskImage: `url(${maskUrl})`,
    }"
    aria-hidden="true"
  />
</template>

<style scoped>
.nav-icon {
  display: inline-block;
  width: 1.125rem;
  height: 1.125rem;
  flex-shrink: 0;
  background-color: currentColor;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-size: contain;
  mask-size: contain;
}
</style>
