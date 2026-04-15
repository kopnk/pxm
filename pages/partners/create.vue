<script setup lang="ts">
definePageMeta({ middleware: ["superadmin"] });

import { reactive } from "vue";
import { useRouter } from "#imports";
import { usePartnersStore } from "@/stores/partners";
import { usePartnersApi } from "@/composables/usePartnersApi";
import { useFormHandler } from "@/composables/useFormHandler";
import { toastSuccessCreated } from "@/composables/useToastMessages";
import FormShell from "@/components/form/FormShell.vue";
import FormSection from "@/components/form/FormSection.vue";

const router = useRouter();
const store = usePartnersStore();
const { createPartner, getPartners } = usePartnersApi();
const { loading, handle } = useFormHandler();

/* ================= FORM MODEL ================= */
const form = reactive({
  name: "",
  npwp: "",
  bankName: "",
  bankAccount: "",
  partnerType: "individual",
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

/* ================= SUBMIT ================= */
const submit = async () => {
  await handle(async () => {
    const payload = {
      name: form.name,
      npwp: form.npwp,
      bankName: form.bankName,
      bankAccount: form.bankAccount,
      partnerType: form.partnerType,
      addressText: form.addressText,
      contactName: form.contactName,
      contactPhone: form.contactPhone,
      contactEmail: form.contactEmail,
      signatoryName: form.signatoryName || undefined,
      signatoryTitle: form.signatoryTitle || undefined,
      rating: form.rating,
      isActive: form.isActive,
      addressMeta: {
        province: form.province,
        city: form.city,
        district: form.district,
        postalCode: form.postalCode,
      },
    };

    await createPartner(payload);

    // tetap refresh store (logic tidak diubah)
    const res: any = await getPartners({
      page: store.page,
      limit: store.limit,
    });

    store.setPartners(res.data);

    await router.replace("/partners");
  }, toastSuccessCreated("partner"));
};
</script>

<template>
  <FormShell
    title="Create Partner"
    :loading="loading"
    submit-label="Create"
    @submit="submit"
    @cancel="router.push('/partners')"
  >
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

      <div class="col-md-6">
        <label class="label-field">Partner Type</label>
        <select v-model="form.partnerType" class="form-select">
          <option value="individual">Individual</option>
          <option value="company">Company</option>
        </select>
      </div>
    </FormSection>

    <!-- ADDRESS -->
    <FormSection title="Address">
      <div class="col-12">
        <label class="label-field">Address</label>
        <textarea v-model="form.addressText" class="form-control" />
      </div>

      <div class="col-md-3">
        <label class="label-field">Province</label>
        <input v-model="form.province" class="form-control" />
      </div>

      <div class="col-md-3">
        <label class="label-field">City</label>
        <input v-model="form.city" class="form-control" />
      </div>

      <div class="col-md-3">
        <label class="label-field">District</label>
        <input v-model="form.district" class="form-control" />
      </div>

      <div class="col-md-3">
        <label class="label-field">Postal Code</label>
        <input v-model="form.postalCode" class="form-control" />
      </div>
    </FormSection>

    <!-- CONTACT -->
    <FormSection title="Contact">
      <div class="col-md-6">
        <label class="label-field">Contact Name</label>
        <input v-model="form.contactName" class="form-control" />
      </div>

      <div class="col-md-6">
        <label class="label-field">Contact Phone</label>
        <input v-model="form.contactPhone" class="form-control" />
      </div>

      <div class="col-md-6">
        <label class="label-field">Email</label>
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

      <div class="col-md-6">
        <label>Rating</label>
        <input
          v-model="form.rating"
          type="number"
          step="0.1"
          class="form-control"
        />
      </div>
    </FormSection>
  </FormShell>
</template>
