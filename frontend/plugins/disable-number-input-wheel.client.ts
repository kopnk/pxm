function isFocusedNumberInput(target: EventTarget | null): target is HTMLInputElement {
  return (
    target instanceof HTMLInputElement &&
    target.type === "number" &&
    document.activeElement === target
  );
}

export default defineNuxtPlugin(() => {
  document.addEventListener(
    "wheel",
    (event) => {
      if (isFocusedNumberInput(document.activeElement)) {
        event.preventDefault();
      }
    },
    { passive: false },
  );
});
