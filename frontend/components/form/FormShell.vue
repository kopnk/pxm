<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    title: string;
    loading: boolean;
    submitLabel?: string;
    autofocus?: boolean;
  }>(),
  {
    autofocus: true,
  },
);

const emit = defineEmits(["submit", "cancel"]);

const formRef = ref<HTMLFormElement | null>(null);

const focusableSelector = [
  "[data-autofocus]",
  "input:not([type='hidden']):not([disabled]):not([readonly])",
  "select:not([disabled])",
  "textarea:not([disabled]):not([readonly])",
  "button:not([disabled])",
].join(", ");

const focusPrimaryField = async () => {
  if (!props.autofocus) return;

  await nextTick();

  const target = formRef.value?.querySelector<HTMLElement>(focusableSelector);
  target?.focus();
};

const focusFirstInvalidField = () => {
  const target = formRef.value?.querySelector<HTMLElement>(":invalid");
  target?.focus();
};

const submitForm = () => {
  const form = formRef.value;
  if (form && !form.checkValidity()) {
    focusFirstInvalidField();
    form.reportValidity();
    return;
  }

  emit("submit");
};

onMounted(() => {
  void focusPrimaryField();
});

watch(
  () => props.loading,
  (loading, wasLoading) => {
    if (wasLoading && !loading) {
      void focusPrimaryField();
    }
  },
);
</script>

<template>
  <div class="container-fluid">
    <div class="pxm-form-wrap">
      <div class="card pxm-form-shell">
        <div class="card-body">
          <div class="pxm-form-header">
            <h4 class="text-brand mb-0">
              {{ title }}
            </h4>
            <slot name="header-actions" />
          </div>

          <form ref="formRef" :aria-busy="loading" @submit.prevent="submitForm">
            <slot />

            <div class="pxm-form-actions d-flex justify-content-end gap-2">
              <button
                type="button"
                class="btn btn-outline-secondary"
                :disabled="loading"
                @click="$emit('cancel')"
              >
                Cancel
              </button>

              <button
                type="submit"
                class="btn btn-primary"
                :disabled="loading"
              >
                <span
                  v-if="loading"
                  class="spinner-border spinner-border-sm me-2"
                  aria-hidden="true"
                ></span>
                {{ submitLabel || "Save" }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
