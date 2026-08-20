<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import { useRouter } from "#imports";
import FormShell from "@/components/form/FormShell.vue";
import FormSection from "@/components/form/FormSection.vue";
import { useDcnApi, DCN_OUT_TYPE_OPTIONS } from "@/composables/useDcnApi";
import { useFormHandler } from "@/composables/useFormHandler";
import { toastSuccessCreated } from "@/composables/useToastMessages";
import { useNotify } from "@/composables/useNotify";

const router = useRouter();
const notify = useNotify();
const { createDcn, getNextOutNumber } = useDcnApi();
const { loading, handle } = useFormHandler();

const form = reactive({
  letterDate: "",
  number: "",
  flow: "out" as "in" | "out",
  type: "",
  toAddress: "",
  fromAddress: "",
  subject: "",
});

const isOutFlow = computed(() => form.flow === "out");
const canShowNumber = computed(() =>
  form.flow === "in" || (form.flow === "out" && !!form.type),
);

const generateOutNumber = async () => {
  if (!isOutFlow.value || !form.type || !form.letterDate) return;
  form.number = await getNextOutNumber(form.type, form.letterDate);
};

watch(
  () => [form.flow, form.type, form.letterDate] as const,
  async ([flow]) => {
    if (flow !== "out") {
      form.type = "";
      form.number = "";
      return;
    }
    await generateOutNumber();
  },
);

const submit = async () => {
  if (!form.letterDate) {
    notify.warning("Letter date is required.");
    return;
  }

  if (form.flow === "out" && !form.type) {
    notify.warning("Type is required for out flow.");
    return;
  }

  if (!form.number.trim()) {
    notify.warning("DCN number is required.");
    return;
  }

  await handle(async () => {
    await createDcn({
      letterDate: form.letterDate,
      number: form.number.trim(),
      flow: form.flow,
      type: form.type || undefined,
      toAddress: form.toAddress || undefined,
      fromAddress: form.fromAddress || undefined,
      subject: form.subject || undefined,
    });
    await router.push("/dcn");
  }, toastSuccessCreated("dcn"));
};
</script>

<template>
  <FormShell
    title="Create DCN"
    :loading="loading"
    submit-label="Save"
    @submit="submit"
    @cancel="router.push('/dcn')"
  >
    <FormSection>
      <div class="col-md-4">
        <label class="label-field">Letter Date</label>
        <input v-model="form.letterDate" type="date" class="form-control" />
      </div>

      <div class="col-md-4">
        <label class="label-field">Flow</label>
        <select v-model="form.flow" class="form-select">
          <option value="in">In</option>
          <option value="out">Out</option>
        </select>
      </div>

      <div class="col-md-4">
        <label class="label-field">Type</label>
        <select v-if="isOutFlow" v-model="form.type" class="form-select">
          <option value="">Select type</option>
          <option
            v-for="option in DCN_OUT_TYPE_OPTIONS"
            :key="option.value"
            :value="option.value"
          >
            {{ option.value }} - {{ option.label }}
          </option>
        </select>
        <input
          v-else
          v-model="form.type"
          class="form-control"
          placeholder="Type (optional)"
        />
      </div>

      <div class="col-md-6">
        <label v-if="canShowNumber" class="label-field">Number</label>
        <input
          v-if="canShowNumber"
          v-model="form.number"
          class="form-control"
          :readonly="isOutFlow"
          placeholder="0001.K310.02.26"
        />
        <div v-if="isOutFlow && canShowNumber" class="data-meta mt-1">
          Auto generated based on type and year.
        </div>
      </div>

      <div class="w-100"></div>

      <div class="col-12 col-md-6">
        <label class="label-field">From</label>
        <input v-model="form.fromAddress" class="form-control" />
      </div>

      <div class="col-12 col-md-6">
        <label class="label-field">To</label>
        <input v-model="form.toAddress" class="form-control" />
      </div>

      <div class="col-md-12">
        <label class="label-field">Subject</label>
        <textarea v-model="form.subject" class="form-control" rows="3" />
      </div>
    </FormSection>
  </FormShell>
</template>
