<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import type { PDFDocumentLoadingTask } from "pdfjs-dist";

definePageMeta({
  layout: false,
});

const route = useRoute();
const canvasContainer = ref<HTMLElement | null>(null);
const errorMessage = ref("");
const loading = ref(true);
const pageCount = ref(0);
const pdfObjectUrl = ref("");
const pdfFilename = ref("purchase-order.pdf");
let loadingTask: PDFDocumentLoadingTask | null = null;

function resolveOpaquePo() {
  const value = typeof route.query.po === "string" ? route.query.po : "";
  return value.startsWith("v1.") ? value : "";
}

function downloadPdf() {
  if (!pdfObjectUrl.value) return;
  const anchor = document.createElement("a");
  anchor.href = pdfObjectUrl.value;
  anchor.download = pdfFilename.value;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function openPdfInBrowser() {
  if (!pdfObjectUrl.value) return;
  window.open(pdfObjectUrl.value, "_blank", "noopener,noreferrer");
}

async function renderPdf() {
  const opaquePo = resolveOpaquePo();
  if (!opaquePo) {
    errorMessage.value = "Tautan QR Purchase Order tidak valid.";
    loading.value = false;
    return;
  }

  try {
    const response = await fetch(
      `/api/reports/partner-po-pdf?po=${encodeURIComponent(opaquePo)}`,
      { credentials: "include", cache: "no-store" },
    );
    if (!response.ok) {
      throw new Error(
        response.status === 401
          ? "Sesi login telah berakhir. Silakan login kembali."
          : "Purchase Order tidak dapat dimuat.",
      );
    }

    const blob = await response.blob();
    pdfObjectUrl.value = URL.createObjectURL(blob);
    const disposition = response.headers.get("content-disposition") || "";
    const filenameMatch = disposition.match(/filename="?([^";]+)"?/i);
    if (filenameMatch?.[1]) pdfFilename.value = filenameMatch[1];

    const pdfjs = await import("pdfjs-dist");
    const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url"))
      .default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

    loadingTask = pdfjs.getDocument({ data: await blob.arrayBuffer() });
    const pdf = await loadingTask.promise;
    pageCount.value = pdf.numPages;
    loading.value = false;
    await nextTick();

    const container = canvasContainer.value;
    if (!container) return;
    container.replaceChildren();

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const availableWidth = Math.max(container.clientWidth - 24, 280);
      const cssScale = Math.min(2, availableWidth / baseViewport.width);
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: cssScale * pixelRatio });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas tidak tersedia.");

      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      canvas.style.width = `${Math.ceil(viewport.width / pixelRatio)}px`;
      canvas.style.height = `${Math.ceil(viewport.height / pixelRatio)}px`;
      canvas.className = "pdf-page shadow-sm";
      container.appendChild(canvas);
      await page.render({ canvas, canvasContext: context, viewport }).promise;
      page.cleanup();
    }
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : "Purchase Order tidak dapat dimuat.";
    loading.value = false;
  }
}

onMounted(renderPdf);

onBeforeUnmount(() => {
  if (pdfObjectUrl.value) URL.revokeObjectURL(pdfObjectUrl.value);
  void loadingTask?.destroy();
});
</script>

<template>
  <main class="pdf-viewer min-vh-100">
    <header class="viewer-toolbar sticky-top px-3 py-2">
      <div class="d-flex align-items-center justify-content-between gap-2">
        <NuxtLink to="/" class="btn btn-sm btn-outline-light">Kembali</NuxtLink>
        <span class="small text-white text-truncate">
          Purchase Order
          <template v-if="pageCount"> · {{ pageCount }} halaman</template>
        </span>
        <div class="d-flex gap-2">
          <button
            type="button"
            class="btn btn-sm btn-light"
            :disabled="!pdfObjectUrl"
            @click="downloadPdf"
          >
            Unduh
          </button>
          <button
            type="button"
            class="btn btn-sm btn-outline-light d-none d-sm-inline-block"
            :disabled="!pdfObjectUrl"
            @click="openPdfInBrowser"
          >
            Buka di browser
          </button>
        </div>
      </div>
    </header>

    <section
      v-if="loading"
      class="min-vh-100 d-flex align-items-center justify-content-center"
    >
      <div class="text-center text-white">
        <div class="spinner-border mb-3" role="status">
          <span class="visually-hidden">Memuat...</span>
        </div>
        <p class="mb-0">Memuat Purchase Order...</p>
      </div>
    </section>

    <section
      v-else-if="errorMessage"
      class="min-vh-100 d-flex align-items-center justify-content-center p-4"
    >
      <div class="card border-0 shadow-sm text-center p-4">
        <h1 class="h5 mb-3">PDF tidak dapat dibuka</h1>
        <p class="text-muted mb-3">{{ errorMessage }}</p>
        <NuxtLink to="/auth/signin" class="btn btn-primary">
          Login kembali
        </NuxtLink>
      </div>
    </section>

    <section
      v-show="!loading && !errorMessage"
      ref="canvasContainer"
      class="pdf-pages d-flex flex-column align-items-center gap-3 p-2 p-md-3"
      aria-label="Dokumen Purchase Order"
    />
  </main>
</template>

<style scoped>
.pdf-viewer {
  background: #303030;
}

.viewer-toolbar {
  z-index: 10;
  background: #212529;
}

.pdf-pages {
  overflow-x: auto;
}

.pdf-pages :deep(.pdf-page) {
  display: block;
  max-width: 100%;
  height: auto !important;
  background: #fff;
}
</style>
