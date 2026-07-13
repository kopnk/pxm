<script setup lang="ts">
import { onMounted } from "vue";
import { useRoute, useRouter } from "#imports";
import FormShell from "@/components/form/FormShell.vue";
import FormSection from "@/components/form/FormSection.vue";
import { useFormHandler } from "@/composables/useFormHandler";
import { useNotify } from "@/composables/useNotify";
import { useProgressStageApi } from "@/composables/useProgressStageApi";
import { useProgressStageForm } from "@/composables/useProgressStageForm";
import { toastSuccessUpdated } from "@/composables/useToastMessages";

const route = useRoute();
const router = useRouter();
const notify = useNotify();
const { loading, handle } = useFormHandler();
const { getProgressStageById, updateProgressStage } = useProgressStageApi();
const { form, fillForm, toPayload } = useProgressStageForm();

const id = String(route.query.id || "");

onMounted(async () => {
  if (!id) {
    notify.error("Progress stage ID is required");
    await router.push("/progress-stage");
    return;
  }

  const res: any = await getProgressStageById(id);
  fillForm(res.data);
});

const submit = async () => {
  await handle(async () => {
    await updateProgressStage(id, toPayload());
    await router.push("/progress-stage");
  }, toastSuccessUpdated("progressStage"));
};
</script>

<template>
  <FormShell
    title="Update Progress Stage"
    :loading="loading"
    submit-label="Update"
    @submit="submit"
    @cancel="router.push('/progress-stage')"
  >
    <FormSection>
      <div class="col-md-6">
        <label class="label-field">Code</label>
        <input
          v-model="form.code"
          name="code"
          class="form-control"
          required
          minlength="2"
          maxlength="50"
          pattern="[a-z0-9_]+"
          data-autofocus
        />
      </div>

      <div class="col-md-6">
        <label class="label-field">Name</label>
        <input
          v-model="form.name"
          name="name"
          class="form-control"
          required
          minlength="3"
          maxlength="100"
        />
      </div>

      <div class="col-md-6">
        <label class="label-field">Type</label>
        <select v-model="form.stageType" name="stageType" class="form-select" required>
          <option value="admin">Admin</option>
          <option value="field">Field</option>
          <option value="document">Document</option>
        </select>
      </div>

      <div class="col-md-6">
        <label class="label-field">Sequence</label>
        <input
          v-model.number="form.sequence"
          name="sequence"
          type="number"
          min="1"
          step="1"
          class="form-control"
          required
        />
      </div>

      <div class="col-md-6 form-check ms-2">
        <input
          id="stageActive"
          v-model="form.isActive"
          name="isActive"
          type="checkbox"
          class="form-check-input"
        />
        <label for="stageActive" class="form-check-label">Active</label>
      </div>
    </FormSection>
  </FormShell>
</template>
