<script setup lang="ts">
import { nextTick, onMounted, watch } from "vue";

const route = useRoute();

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
  <div class="app-wrapper">
    <Header />

    <main class="main-scroll">
      <slot />
    </main>

    <Footer />
  </div>
</template>

<style scoped>
.app-wrapper {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden; /* body tidak scroll */
}

footer {
  position: sticky;
  bottom: 0;
  z-index: 1100;
}

.main-scroll {
  flex: 1;
  position: relative;
  z-index: 0;
  overflow: auto;
  padding: 1rem 1.25rem;
  background: #fafafa;
}
</style>
