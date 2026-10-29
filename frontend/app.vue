<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <AppToast />
</template>

<script setup>
import { onBeforeUnmount, onMounted } from "vue";
import AppToast from "@/components/AppToast.vue";

let activeTable = null;
let proxy = null;
let proxyContent = null;
let contentObserver = null;
let resizeObserver = null;
let frame = 0;

const scheduleScrollbarUpdate = () => {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    updateScrollbar();
  });
};

const updateScrollbar = () => {
  if (!proxy || !proxyContent) return;

  const table = Array.from(document.querySelectorAll(".table-scroll-x")).find((item) => {
    const bounds = item.getBoundingClientRect();
    return item.scrollWidth > item.clientWidth && bounds.bottom > 0 && bounds.top < window.innerHeight;
  });

  if (activeTable !== table) {
    activeTable?.classList.remove("app-horizontal-scroll-active");
    activeTable = table || null;
    activeTable?.classList.add("app-horizontal-scroll-active");
  }

  if (!activeTable) {
    proxy.hidden = true;
    return;
  }

  const bounds = activeTable.getBoundingClientRect();
  proxy.style.left = `${bounds.left}px`;
  proxy.style.width = `${bounds.width}px`;
  proxyContent.style.width = `${activeTable.scrollWidth}px`;
  proxy.scrollLeft = activeTable.scrollLeft;
  proxy.hidden = false;
};

const handleDocumentScroll = (event) => {
  if (event.target === activeTable && proxy) {
    proxy.scrollLeft = activeTable.scrollLeft;
    return;
  }
  scheduleScrollbarUpdate();
};

onMounted(() => {
  proxy = document.createElement("div");
  proxy.className = "app-horizontal-scrollbar";
  proxy.hidden = true;
  proxy.setAttribute("aria-label", "Horizontal table scroll");
  proxyContent = document.createElement("div");
  proxy.append(proxyContent);
  document.body.append(proxy);

  proxy.addEventListener("scroll", () => {
    if (activeTable) activeTable.scrollLeft = proxy.scrollLeft;
  });
  document.addEventListener("scroll", handleDocumentScroll, true);
  window.addEventListener("resize", scheduleScrollbarUpdate);

  contentObserver = new MutationObserver(scheduleScrollbarUpdate);
  contentObserver.observe(document.body, { childList: true, subtree: true });
  resizeObserver = new ResizeObserver(scheduleScrollbarUpdate);
  resizeObserver.observe(document.documentElement);
  scheduleScrollbarUpdate();
});

onBeforeUnmount(() => {
  cancelAnimationFrame(frame);
  activeTable?.classList.remove("app-horizontal-scroll-active");
  contentObserver?.disconnect();
  resizeObserver?.disconnect();
  document.removeEventListener("scroll", handleDocumentScroll, true);
  window.removeEventListener("resize", scheduleScrollbarUpdate);
  proxy?.remove();
});
</script>
