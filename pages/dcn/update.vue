<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "#imports";
import FormShell from "@/components/form/FormShell.vue";
import FormSection from "@/components/form/FormSection.vue";
import { useDcnApi, DCN_OUT_TYPE_OPTIONS } from "@/composables/useDcnApi";
import { useFormHandler } from "@/composables/useFormHandler";
import { toastSuccessUpdated } from "@/composables/useToastMessages";
import { useNotify } from "@/composables/useNotify";

const route = useRoute();
const router = useRouter();
const notify = useNotify();

const { getDcnById, updateDcn, getNextOutNumber } = useDcnApi();
const { loading: saving, handle } = useFormHandler();

const id = route.query.id as string;
const loading = ref(false);

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

const loadDetail = async () => {
  if (!id) {
    await router.replace("/dcn");
    return;
  }

  loading.value = true;
  try {
    const data = await getDcnById(id);
    form.letterDate = data.letterDate || "";
    form.number = data.number || "";
    form.flow = data.flow || "in";
    form.type = data.type || "";
    form.toAddress = data.toAddress || "";
    form.fromAddress = data.fromAddress || "";
    form.subject = data.subject || "";
  } catch {
    await router.replace("/dcn");
  } finally {
    loading.value = false;
  }
};

await loadDetail();

watch(
  () => form.flow,
  (next) => {
    if (next !== "out") {
      form.type = "";
    }
  },
);

const regenerateOutNumber = async () => {
  if (!isOutFlow.value || !form.type || !form.letterDate) {
    notify.warning("Flow out, type, and letter date are required.");
    return;
  }
  form.number = await getNextOutNumber(form.type, form.letterDate);
};

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
    await updateDcn(id, {
      letterDate: form.letterDate,
      number: form.number.trim(),
      flow: form.flow,
      type: form.type || undefined,
      toAddress: form.toAddress || undefined,
      fromAddress: form.fromAddress || undefined,
      subject: form.subject || undefined,
    });
    await router.push("/dcn");
  }, toastSuccessUpdated("dcn"));
};
</script>

<template>
  <FormShell
    title="Update DCN"
    :loading="saving || loading"
    submit-label="Update"
    @submit="submit"
    @cancel="router.push('/dcn')"
  >
    <div v-if="loading" class="text-center py-4">Loading...</div>

    <FormSection v-else>
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

      <div class="col-md-8">
        <label v-if="canShowNumber" class="label-field">Number</label>
        <input
          v-if="canShowNumber"
          v-model="form.number"
          class="form-control"
          :readonly="isOutFlow"
          placeholder="0001.K310.02.26"
        />
      </div>

      <div class="col-md-4 d-flex align-items-end">
        <button
          v-if="isOutFlow"
          type="button"
          class="btn btn-outline-secondary w-100"
          @click="regenerateOutNumber"
        >
          Regenerate Number
        </button>
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
