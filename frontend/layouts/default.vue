<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from "vue";

const route = useRoute();

/* Sidebar rail preference is a per-device convenience only. */
const SIDEBAR_KEY = "pxm.sidebar-collapsed";
const collapsed = ref(false);

onMounted(() => {
  try {
    collapsed.value = localStorage.getItem(SIDEBAR_KEY) === "1";
  } catch {
    // Storage can be unavailable (private mode); default stays expanded.
  }
});

watch(collapsed, (value) => {
  try {
    localStorage.setItem(SIDEBAR_KEY, value ? "1" : "0");
  } catch {
    // Ignore: the preference simply is not remembered.
  }
});

const focusPageTarget = async () => {
  await nextTick();

  if (document.querySelector("[data-autofocus]")) {
    return;
  }

  const main = document.querySelector("main");
  const target =
    main?.querySelector<HTMLElement>("[data-page-focus]") ??
    main?.querySelector<HTMLElement>("h1, h2, h3, h4");

  if (!target) return;

  if (!target.hasAttribute("tabindex")) {
    target.setAttribute("tabindex", "-1");
  }

  target.focus({ preventScroll: true });
};

onMounted(() => {
  void focusPageTarget();
});

watch(
  () => route.fullPath,
  () => {
    void focusPageTarget();
  },
);
</script>

<template>
  <div class="app-shell" :class="{ 'is-collapsed': collapsed }">
    <a class="skip-link" href="#main-content">Skip to content</a>
    <AppNavigation v-model:collapsed="collapsed" />

    <main id="main-content" class="main-scroll" tabindex="-1">
      <slot />
    </main>
  </div>
</template>
