<script setup lang="ts">
const props = defineProps<{
  visible: boolean;
  password: string;
  title?: string;
}>();
const emit = defineEmits<{ close: [] }>();
const copied = ref(false);

const copyPassword = async () => {
  await navigator.clipboard.writeText(props.password);
  copied.value = true;
};

watch(() => props.visible, (visible) => {
  if (!visible) copied.value = false;
});
</script>

<template>
  <div v-if="visible" class="modal-backdrop fade show" />
  <div
    v-if="visible"
    class="modal d-block"
    role="dialog"
    aria-modal="true"
    aria-labelledby="temporary-password-title"
  >
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
      <div class="modal-header">
        <h5 id="temporary-password-title" class="modal-title">
          {{ title || "Temporary password" }}
        </h5>
      </div>
      <div class="modal-body">
        <p class="mb-2">Share this password securely. It is shown only once and the user must replace it at the next sign-in.</p>
        <div class="input-group">
          <input :value="password" class="form-control font-monospace" readonly />
          <button type="button" class="btn btn-outline-secondary" @click="copyPassword">
            {{ copied ? "Copied" : "Copy" }}
          </button>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-primary" @click="emit('close')">Done</button>
      </div>
      </div>
    </div>
  </div>
</template>
