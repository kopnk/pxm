<script setup lang="ts">
definePageMeta({
  middleware: ["superadmin"],
});

import { reactive } from "vue";
import { useRouter } from "#imports";
import { useClientsApi } from "@/composables/useClientsApi";
import { useFormHandler } from "@/composables/useFormHandler";
import { toastSuccessCreated } from "@/composables/useToastMessages";
import FormShell from "@/components/form/FormShell.vue";
import FormSection from "@/components/form/FormSection.vue";

const { createClient } = useClientsApi();
const { loading, handle } = useFormHandler();
const router = useRouter();

const form = reactive({
  name: "",
  npwp: "",
  bankName: "",
  bankAccount: "",
  addressText: "",
  addressMeta: {
    province: "",
    city: "",
    district: "",
    postalCode: "",
  },
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  signatoryName: "",
  signatoryTitle: "",
  isActive: true,
});

const submit = async () => {
  await handle(async () => {
    await createClient({ ...form });
    await router.push("/clients");
  }, toastSuccessCreated("client"));
};
</script>

<template>
  <FormShell
    title="Create Client"
    :loading="loading"
    submit-label="Create"
    @submit="submit"
    @cancel="router.push('/clients')"
  >
    <!-- BASIC -->
    <FormSection>
      <div class="col-md-6">
        <label class="label-field">Name</label>
        <input v-model="form.name" class="form-control" />
      </div>

      <div class="col-md-6">
        <label class="label-field">NPWP</label>
        <input v-model="form.npwp" class="form-control" />
      </div>

      <div class="col-md-6">
        <label class="label-field">Bank Name</label>
        <input v-model="form.bankName" class="form-control" />
      </div>

      <div class="col-md-6">
        <label class="label-field">Bank Account</label>
        <input v-model="form.bankAccount" class="form-control" />
      </div>
    </FormSection>

    <!-- ADDRESS -->
    <FormSection title="Address">
      <div class="col-12">
        <label class="label-field">Address</label>
        <textarea v-model="form.addressText" class="form-control" />
      </div>

      <div class="col-md-6">
        <label class="label-field">Province</label>
        <input v-model="form.addressMeta.province" class="form-control" />
      </div>

      <div class="col-md-6">
        <label class="label-field">City</label>
        <input v-model="form.addressMeta.city" class="form-control" />
      </div>

      <div class="col-md-6">
        <label class="label-field">District</label>
        <input v-model="form.addressMeta.district" class="form-control" />
      </div>

      <div class="col-md-6">
        <label class="label-field">Postal Code</label>
        <input v-model="form.addressMeta.postalCode" class="form-control" />
      </div>
    </FormSection>

    <!-- CONTACT -->
    <FormSection title="Contact">
      <div class="col-md-4">
        <label class="label-field">Contact Name</label>
        <input v-model="form.contactName" class="form-control" />
      </div>

      <div class="col-md-4">
        <label class="label-field">Contact Phone</label>
        <input v-model="form.contactPhone" class="form-control" />
      </div>

      <div class="col-md-4">
        <label class="label-field">Contact Email</label>
        <input v-model="form.contactEmail" class="form-control" />
      </div>

      <div class="col-md-6">
        <label class="label-field">Signatory Name</label>
        <input v-model="form.signatoryName" class="form-control" />
      </div>

      <div class="col-md-6">
        <label class="label-field">Signatory Title</label>
        <input v-model="form.signatoryTitle" class="form-control" />
      </div>
    </FormSection>
  </FormShell>
</template>
