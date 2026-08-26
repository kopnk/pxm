<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";

type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
  remark?: string;
};

const props = withDefaults(
  defineProps<{
    modelValue: string | null;
    options: SelectOption[];
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    name?: string;
    searchable?: boolean;
    searchPlaceholder?: string;
  }>(),
  {
    placeholder: "Select an option",
    disabled: false,
    required: false,
    name: undefined,
    searchable: false,
    searchPlaceholder: "Search...",
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
  select: [option: SelectOption];
}>();
const root = ref<HTMLElement | null>(null);
const trigger = ref<HTMLButtonElement | null>(null);
const open = ref(false);
const query = ref("");
const searchInput = ref<HTMLInputElement | null>(null);
const validationError = ref(false);

const selected = computed(() =>
  props.options.find((option) => option.value === props.modelValue),
);
const visibleOptions = computed(() => {
  const keyword = query.value.trim().toLocaleLowerCase();
  if (!keyword) return props.options;
  return props.options.filter((option) =>
    `${option.label} ${option.remark ?? ""}`.toLocaleLowerCase().includes(keyword),
  );
});

const toggle = async () => {
  open.value = !open.value;
  if (!open.value || !props.searchable) return;
  await nextTick();
  searchInput.value?.focus();
};

const handleInvalid = (event: Event) => {
  event.preventDefault();
  validationError.value = true;
  trigger.value?.focus();
};

const selectOption = (option: SelectOption) => {
  if (option.disabled) return;
  emit("select", option);
  emit("update:modelValue", option.value);
  validationError.value = false;
  open.value = false;
  query.value = "";
};

const closeFromOutside = (event: PointerEvent) => {
  if (!root.value?.contains(event.target as Node)) open.value = false;
};

watch(open, (isOpen) => {
  if (isOpen) document.addEventListener("pointerdown", closeFromOutside);
  else document.removeEventListener("pointerdown", closeFromOutside);
});

watch(
  () => props.modelValue,
  (value) => {
    if (value) validationError.value = false;
  },
);

onBeforeUnmount(() => document.removeEventListener("pointerdown", closeFromOutside));
</script>

<template>
  <div ref="root" class="scrollable-select">
    <button
      ref="trigger"
      type="button"
      class="form-select scrollable-select__trigger text-start"
      :class="{
        'text-body-secondary': !selected,
        'is-invalid': validationError,
      }"
      :disabled="disabled"
      :aria-expanded="open"
      :aria-invalid="validationError"
      :aria-required="required"
      aria-haspopup="listbox"
      @click="toggle"
      @keydown.down.prevent="open = true"
      @keydown.esc="open = false"
    >
      <span>{{ selected?.label || placeholder }}</span>
      <span v-if="selected" class="scrollable-select__check ms-2" aria-label="Selected">✓</span>
    </button>

    <input
      v-if="name"
      :name="name"
      :value="modelValue"
      :required="required"
      tabindex="-1"
      class="scrollable-select__validation"
      @invalid="handleInvalid"
    />

    <div v-if="validationError" class="invalid-feedback d-block">
      Please select an option.
    </div>

    <div v-if="open" class="scrollable-select__menu shadow" role="listbox">
      <div v-if="searchable" class="scrollable-select__search">
        <input
          ref="searchInput"
          v-model="query"
          type="search"
          class="form-control"
          :placeholder="searchPlaceholder"
          @keydown.esc="open = false"
        />
      </div>
      <button
        v-for="option in visibleOptions"
        :key="option.value"
        type="button"
        class="scrollable-select__option"
        :class="{ 'is-selected': option.value === modelValue }"
        :disabled="option.disabled"
        role="option"
        :aria-selected="option.value === modelValue"
        @click="selectOption(option)"
      >
        <span>{{ option.label }}</span>
        <span class="d-flex align-items-center gap-1 ms-2">
          <small v-if="option.remark" class="text-body-secondary">{{ option.remark }}</small>
          <span
            v-if="option.value === modelValue"
            class="scrollable-select__check"
            aria-label="Selected"
          >✓</span>
        </span>
      </button>
      <div v-if="!visibleOptions.length" class="p-3 text-body-secondary">No options available</div>
    </div>
  </div>
</template>

<style scoped>
.scrollable-select { position: relative; }
.scrollable-select__trigger { display: flex; align-items: center; justify-content: space-between; min-height: 38px; }
.scrollable-select__menu {
  position: absolute; z-index: 1055; inset-inline: 0; top: calc(100% + 4px);
  max-height: min(320px, 52dvh); overflow-y: auto; overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch; touch-action: pan-y; background: var(--bs-body-bg);
  border: 1px solid var(--bs-border-color); border-radius: var(--bs-border-radius);
}
.scrollable-select__search { position: sticky; top: 0; z-index: 1; padding: .5rem; background: var(--bs-body-bg); border-bottom: 1px solid var(--bs-border-color); }
.scrollable-select__option {
  width: 100%; min-height: 46px; padding: .625rem .75rem; border: 0;
  border-bottom: 1px solid var(--bs-border-color); background: transparent; color: inherit;
  display: flex; align-items: center; justify-content: space-between; text-align: left;
}
.scrollable-select__option:last-child { border-bottom: 0; }
.scrollable-select__option:hover, .scrollable-select__option.is-selected { background: var(--bs-tertiary-bg); }
.scrollable-select__check { color: var(--bs-success); font-size: 1.1rem; font-weight: 700; line-height: 1; }
.scrollable-select__validation { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
@media (max-width: 767.98px) {
  .scrollable-select__menu { max-height: min(360px, 55dvh); }
  .scrollable-select__option { align-items: flex-start; gap: .5rem; }
}
</style>
