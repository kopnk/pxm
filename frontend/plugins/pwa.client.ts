export default defineNuxtPlugin(() => {
  if (import.meta.dev) return;
  if (!import.meta.client) return;
  if (!("serviceWorker" in navigator)) return;

  const registerWorker = async () => {
    try {
      await navigator.serviceWorker.register("/sw.js");
    } catch (error) {
      console.error("[pwa] service worker registration failed", error);
    }
  };

  if (document.readyState === "complete") {
    void registerWorker();
  } else {
    window.addEventListener("load", registerWorker, { once: true });
  }
});
