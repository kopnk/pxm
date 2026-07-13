<script setup lang="ts">
import { ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    modelValue: number | null | undefined;
    min?: number;
    max?: number;
    required?: boolean;
    disabled?: boolean;
    readonly?: boolean;
    placeholder?: string;
    maximumFractionDigits?: number;
  }>(),
  {
    modelValue: null,
    placeholder: "",
    maximumFractionDigits: 8,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: number | null];
}>();

const focused = ref(false);
const text = ref(formatForInput(props.modelValue));

function formatForInput(value: number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return "";
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: props.maximumFractionDigits,
  }).format(Number(value));
}

function parseDecimal(value: string) {
  const cleaned = value.trim().replace(/\s/g, "");
  if (!cleaned) return null;

  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function onInput(event: Event) {
  const target = event.target as HTMLInputElement;
  text.value = target.value;
  emit("update:modelValue", parseDecimal(target.value));
}

function onBlur() {
  focused.value = false;
  text.value = formatForInput(props.modelValue);
}

watch(
  () => props.modelValue,
  (value) => {
    if (!focused.value) text.value = formatForInput(value);
  },
);
</script>

<template>
  <input
    :value="text"
    type="text"
    inputmode="decimal"
    class="form-control"
    :min="min"
    :max="max"
    :required="required"
    :disabled="disabled"
    :readonly="readonly"
    :placeholder="placeholder"
    @focus="focused = true"
    @input="onInput"
    @blur="onBlur"
  />
</template>
