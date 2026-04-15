<script setup lang="ts">
definePageMeta({
  middleware: ["superadmin"],
});

import { reactive, ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "#imports";
import { useClientsApi } from "@/composables/useClientsApi";
import { useFormHandler } from "@/composables/useFormHandler";
import { toastSuccessUpdated } from "@/composables/useToastMessages";
import FormShell from "@/components/form/FormShell.vue";
import FormSection from "@/components/form/FormSection.vue";

const route = useRoute();
const router = useRouter();
const { getClientById, updateClient } = useClientsApi();
const { loading: saving, handle } = useFormHandler();

const id = route.query.id as string;

const loading = ref(false);

/* ================= FORM STATE ================= */
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

/* ================= VALIDATION ================= */
const isValid = computed(() => form.name.trim().length >= 2);

/* ================= FETCH DETAIL ================= */
onMounted(async () => {
  if (!id) return;

  loading.value = true;

  try {
    const data = await getClientById(id);

    if (data) {
      Object.assign(form, data);

      if (!form.addressMeta) {
        form.addressMeta = {
          province: "",
          city: "",
          district: "",
          postalCode: "",
        };
      }
    }
  } catch (err) {
    router.push("/clients");
  } finally {
    loading.value = false;
  }
});

/* ================= SUBMIT ================= */
const submit = async () => {
  if (!isValid.value) return;

  await handle(async () => {
    await updateClient(id, { ...form });
    await router.replace("/clients");
  }, toastSuccessUpdated("client"));
};
</script>

<template>
  <FormShell
    title="Update Client"
    :loading="saving || loading"
    submit-label="Update"
    @submit="submit"
    @cancel="router.push('/clients')"
  >
    <div v-if="loading" class="text-center py-4">Loading...</div>

    <template v-else>
      <!-- BASIC -->
      <FormSection>
        <div class="col-12 col-md-6">
          <label class="label-field">Name</label>
          <input v-model="form.name" class="form-control" />
        </div>

        <div class="col-12 col-md-6">
          <label class="label-field">NPWP</label>
          <input v-model="form.npwp" class="form-control" />
        </div>

        <div class="col-12 col-md-6">
          <label class="label-field">Bank Name</label>
          <input v-model="form.bankName" class="form-control" />
        </div>

        <div class="col-12 col-md-6">
          <label class="label-field">Bank Account</label>
          <input v-model="form.bankAccount" class="form-control" />
        </div>

        <div class="col-12">
          <label class="label-field">Address</label>
          <textarea v-model="form.addressText" class="form-control" />
        </div>
      </FormSection>

      <!-- ADDRESS META -->
      <FormSection title="Address Detail">
        <div class="col-12 col-md-6">
          <label class="label-field">Province</label>
          <input v-model="form.addressMeta.province" class="form-control" />
        </div>

        <div class="col-12 col-md-6">
          <label class="label-field">City</label>
          <input v-model="form.addressMeta.city" class="form-control" />
        </div>

        <div class="col-12 col-md-6">
          <label class="label-field">District</label>
          <input v-model="form.addressMeta.district" class="form-control" />
        </div>

        <div class="col-12 col-md-6">
          <label class="label-field">Postal Code</label>
          <input v-model="form.addressMeta.postalCode" class="form-control" />
        </div>
      </FormSection>

      <!-- CONTACT -->
      <FormSection title="Contact">
        <div class="col-12 col-md-4">
          <label class="label-field">Contact Name</label>
          <input v-model="form.contactName" class="form-control" />
        </div>

        <div class="col-12 col-md-4">
          <label class="label-field">Contact Phone</label>
          <input v-model="form.contactPhone" class="form-control" />
        </div>

        <div class="col-12 col-md-4">
          <label class="label-field">Contact Email</label>
          <input v-model="form.contactEmail" class="form-control" />
        </div>

        <div class="col-12 col-md-6">
          <label class="label-field">Signatory Name</label>
          <input v-model="form.signatoryName" class="form-control" />
        </div>

        <div class="col-12 col-md-6">
          <label class="label-field">Signatory Title</label>
          <input v-model="form.signatoryTitle" class="form-control" />
        </div>

        <div class="col-12 col-md-4">
          <label class="label-field">Status</label>
          <select v-model="form.isActive" class="form-select">
            <option :value="true">Active</option>
            <option :value="false">Inactive</option>
          </select>
        </div>
      </FormSection>
    </template>
  </FormShell>
</template>
