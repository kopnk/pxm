<script setup lang="ts">
definePageMeta({ middleware: ["superadmin"] });

import { reactive, onMounted, computed } from "vue";
import { useRoute, useRouter } from "#imports";
import { usePartnersStore } from "@/stores/partners";
import { usePartnersApi } from "@/composables/usePartnersApi";
import { useFormHandler } from "@/composables/useFormHandler";
import { toastSuccessUpdated } from "@/composables/useToastMessages";
import FormShell from "@/components/form/FormShell.vue";
import FormSection from "@/components/form/FormSection.vue";

const route = useRoute();
const router = useRouter();
const store = usePartnersStore();
const { getPartnerById, updatePartner, getPartners } = usePartnersApi();
const { loading, handle } = useFormHandler();

const id = route.query.id as string;

/* ================= FORM MODEL ================= */
const form = reactive({
  name: "",
  npwp: "",
  bankName: "",
  bankAccount: "",
  partnerType: "",
  addressText: "",
  province: "",
  city: "",
  district: "",
  postalCode: "",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  signatoryName: "",
  signatoryTitle: "",
  rating: null as number | null,
  isActive: true,
});

/* ================= SAFE BOOLEAN ================= */
const isActiveModel = computed({
  get: () => form.isActive,
  set: (val: any) => {
    form.isActive = val === true || val === "true";
  },
});

/* ================= LOAD DATA ================= */
onMounted(async () => {
  const res: any = await getPartnerById(id);
  const data = res.data;

  Object.assign(form, data);

  form.isActive = Boolean(data.isActive);

  if (data.addressMeta) {
    form.province = data.addressMeta.province || "";
    form.city = data.addressMeta.city || "";
    form.district = data.addressMeta.district || "";
    form.postalCode = data.addressMeta.postalCode || "";
  }
});

/* ================= SUBMIT ================= */
const submit = async () => {
  await handle(async () => {
    const payload = {
      name: form.name,
      npwp: form.npwp || undefined,
      bankName: form.bankName || undefined,
      bankAccount: form.bankAccount || undefined,
      partnerType: form.partnerType,
      addressText: form.addressText || undefined,
      contactName: form.contactName || undefined,
      contactPhone: form.contactPhone || undefined,
      contactEmail: form.contactEmail || undefined,
      signatoryName: form.signatoryName || undefined,
      signatoryTitle: form.signatoryTitle || undefined,
      rating: form.rating ?? undefined,
      isActive: Boolean(form.isActive),
      addressMeta: {
        province: form.province || undefined,
        city: form.city || undefined,
        district: form.district || undefined,
        postalCode: form.postalCode || undefined,
      },
    };

    await updatePartner(id, payload);

    const res: any = await getPartners({
      page: store.page,
      limit: store.limit,
    });

    store.setPartners(res.data);

    await router.replace("/partners");
  }, toastSuccessUpdated("partner"));
};
</script>

<template>
  <FormShell
    title="Update Partner"
    :loading="loading"
    submit-label="Update"
    @submit="submit"
    @cancel="router.push('/partners')"
  >
    <FormSection>
      <!-- BASIC -->
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

      <div class="col-md-6">
        <label class="label-field">Partner Type</label>
        <select v-model="form.partnerType" class="form-select">
          <option value="individual">Individual</option>
          <option value="company">Company</option>
        </select>
      </div>

      <div class="col-md-6">
        <label class="label-field">Rating</label>
        <input
          v-model="form.rating"
          type="number"
          step="0.1"
          min="0"
          max="5"
          class="form-control"
        />
      </div>

      <div class="col-md-6">
        <label class="label-field">Status</label>
        <select v-model="isActiveModel" class="form-select">
          <option :value="true">Active</option>
          <option :value="false">Inactive</option>
        </select>
      </div>
    </FormSection>

    <FormSection title="Address">
      <div class="col-12">
        <label class="label-field">Address</label>
        <textarea v-model="form.addressText" class="form-control"></textarea>
      </div>

      <div class="col-md-4">
        <label class="label-field">Province</label>
        <input v-model="form.province" class="form-control" />
      </div>

      <div class="col-md-4">
        <label class="label-field">City</label>
        <input v-model="form.city" class="form-control" />
      </div>

      <div class="col-md-4">
        <label class="label-field">District</label>
        <input v-model="form.district" class="form-control" />
      </div>

      <div class="col-md-6">
        <label class="label-field">Postal Code</label>
        <input v-model="form.postalCode" class="form-control" />
      </div>
    </FormSection>

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
        <input v-model="form.contactEmail" type="email" class="form-control" />
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
