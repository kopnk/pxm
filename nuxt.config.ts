function useSplitDevArtifacts() {
  return process.env.PXM_LOCAL_SPLIT_DEV === "true";
}

function useCustomBuildArtifacts() {
  return process.env.PXM_ALLOW_CUSTOM_BUILD_DIR === "true";
}

function resolveNuxtBuildDir() {
  if (useCustomBuildArtifacts()) {
    return process.env.NUXT_BUILD_DIR || ".nuxt";
  }

  if (useSplitDevArtifacts()) {
    return process.env.NUXT_BUILD_DIR || ".nuxt-stage-dev";
  }

  return ".nuxt";
}

function resolveViteCacheDir() {
  if (useCustomBuildArtifacts()) {
    return process.env.VITE_CACHE_DIR || "node_modules/.cache/vite";
  }

  if (useSplitDevArtifacts()) {
    return process.env.VITE_CACHE_DIR || "node_modules/.cache/vite-stage-dev";
  }

  return "node_modules/.cache/vite";
}

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  buildDir: resolveNuxtBuildDir(),

  /** Server secret for opaque PDF references. A valid session is still required. */
  runtimeConfig: {
    partnerPoPdfSecret: process.env.PARTNER_PO_PDF_SECRET || "",
    appBaseUrl: process.env.PXM_PUBLIC_APP_URL || "",
    public: {
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || "",
    },
  },

  ssr: false, // Keep SPA mode for the current frontend runtime.

  modules: ["@pinia/nuxt"],

  css: ["~/assets/scss/main.scss"],

  app: {
    head: {
      title: "PXM",
      meta: [
        { name: "theme-color", content: "#0d6efd" },
        { name: "mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-status-bar-style", content: "default" },
        {
          name: "apple-mobile-web-app-title",
          content: "PXM",
        },
        {
          name: "description",
          content:
            "PXM untuk manajemen project, progress, financial, dokumen, user, dan audit.",
        },
      ],
      link: [
        { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
        { rel: "manifest", href: "/manifest.webmanifest" },
        { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      ],
    },
    /** Fade singkat antar halaman (CSS di main.scss, tanpa lib tambahan). */
    pageTransition: { name: "pxm-page", mode: "default" },
  },

  devtools: {
    enabled: process.env.NUXT_DEVTOOLS === "true",
  },

  nitro: {
    preset: process.env.NITRO_PRESET || "node-server",
    output: {
      dir: process.env.NITRO_OUTPUT_DIR || ".output",
    },
  },

  vite: {
    cacheDir: resolveViteCacheDir(),
    css: {
      preprocessorOptions: {
        scss: {
          quietDeps: true,
        },
      },
    },
    build: {
      reportCompressedSize: false,
    },
  },
});
