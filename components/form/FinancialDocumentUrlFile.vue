<script setup lang="ts">
defineProps<{
  modelValue: string;
  fileLabel: string;
  selectedFileName?: string | null;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
  fileChange: [event: Event];
}>();

const onUrlInput = (event: Event) => {
  const value = (event.target as HTMLInputElement | null)?.value ?? "";
  emit("update:modelValue", value);
};
</script>

<template>
  <div class="col-md-3">
    <label class="form-label">Document URL</label>
    <input
      :value="modelValue"
      type="text"
      class="form-control"
      placeholder="https://drive.google.com/..."
      spellcheck="false"
      autocomplete="off"
      @input="onUrlInput"
    />
    <div class="data-meta mt-1">
      Optional. External link (GDrive, local, etc.). Copy manually to access.
    </div>
  </div>
  <div class="col-md-3">
    <label class="form-label">{{ fileLabel }}</label>
    <input
      class="form-control"
      type="file"
      accept=".pdf,.png,.jpg,.jpeg"
      @change="$emit('fileChange', $event)"
    />
    <div class="data-meta mt-1">
      {{ selectedFileName || "Upload file" }}
    </div>
  </div>
</template>
