export default defineNuxtPlugin(async () => {
  await Promise.all([
    import("bootstrap/js/dist/collapse.js"),
    import("bootstrap/js/dist/dropdown.js"),
  ]);
});
