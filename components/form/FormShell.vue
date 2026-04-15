<script setup lang="ts">
defineProps<{
  title: string;
  loading: boolean;
  submitLabel?: string;
}>();

defineEmits(["submit", "cancel"]);
</script>

<template>
  <div class="container-fluid px-3 px-md-4 mt-4">
    <div class="row justify-content-center">
      <div class="col-12 col-xl-10">
        <div class="card shadow-sm">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center gap-2 mb-4">
              <h4 class="text-brand mb-0">
                {{ title }}
              </h4>
              <slot name="header-actions" />
            </div>

            <form @submit.prevent="$emit('submit')">
              <slot />

              <div class="d-flex justify-content-end gap-2 mt-4">
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
                  ></span>
                  {{ submitLabel || "Save" }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
