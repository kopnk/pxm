<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from "vue";

type FocusTarget = "cancel" | "confirm";

const props = withDefaults(
  defineProps<{
    visible: boolean;
    title: string;
    loading?: boolean;
    confirmLabel?: string;
    cancelLabel?: string;
    confirmVariant?: string;
    focusTarget?: FocusTarget;
  }>(),
  {
    loading: false,
    confirmLabel: "Confirm",
    cancelLabel: "Cancel",
    confirmVariant: "danger",
    focusTarget: "confirm",
  },
);

const emit = defineEmits<{
  cancel: [];
  confirm: [];
}>();

const cancelButtonRef = ref<HTMLButtonElement | null>(null);
const confirmButtonRef = ref<HTMLButtonElement | null>(null);
const lastFocusedElement = ref<HTMLElement | null>(null);
const titleId = `confirm-dialog-${Math.random().toString(36).slice(2, 10)}`;

const focusPreferredButton = async () => {
  await nextTick();

  const target =
    props.focusTarget === "cancel"
      ? cancelButtonRef.value ?? confirmButtonRef.value
      : confirmButtonRef.value ?? cancelButtonRef.value;

  target?.focus();
};

const restoreFocus = () => {
  lastFocusedElement.value?.focus();
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key !== "Escape" || props.loading || !props.visible) return;

  event.preventDefault();
  emit("cancel");
};

watch(
  () => props.visible,
  async (visible, wasVisible) => {
    if (visible) {
      lastFocusedElement.value =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;

      window.addEventListener("keydown", handleKeydown);
      await focusPreferredButton();
      return;
    }

    window.removeEventListener("keydown", handleKeydown);

    if (wasVisible) {
      restoreFocus();
    }
  },
);

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <div
    v-if="visible"
    class="modal d-block"
    tabindex="-1"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="titleId"
    style="background: rgba(0, 0, 0, 0.45)"
  >
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 :id="titleId" class="modal-title">
            {{ title }}
          </h5>
          <button
            type="button"
            class="btn-close"
            aria-label="Close"
            :disabled="loading"
            @click="emit('cancel')"
          ></button>
        </div>

        <div class="modal-body">
          <slot />
        </div>

        <div class="modal-footer">
          <button
            ref="cancelButtonRef"
            type="button"
            class="btn btn-secondary"
            :disabled="loading"
            @click="emit('cancel')"
          >
            {{ cancelLabel }}
          </button>

          <button
            ref="confirmButtonRef"
            type="button"
            class="btn"
            :class="`btn-${confirmVariant}`"
            :disabled="loading"
            @click="emit('confirm')"
          >
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
