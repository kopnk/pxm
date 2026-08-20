<script setup lang="ts">
import { useFormHandler } from "@/composables/useFormHandler";
import { toastSuccessUpdated } from "@/composables/useToastMessages";
import FormShell from "@/components/form/FormShell.vue";
import FormSection from "@/components/form/FormSection.vue";
import { apiFetch } from "~/utils/apiFetch";

const router = useRouter();
const profileStore = useProfileStore();
const profileApi = useProfileApi();
const { loading, handle } = useFormHandler();

await profileApi.fetchProfile();

const user = reactive({ ...profileStore.profile! });

const avatarUploaded = ref(false);

/* ================= AVATAR ================= */
const previewAvatar = ref<string | null>(null);
const avatarFile = ref<File | null>(null);

const onAvatarChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  avatarFile.value = file;
  previewAvatar.value = URL.createObjectURL(file);
};

const uploadAvatar = async () => {
  if (!avatarFile.value) return;

  const formData = new FormData();
  formData.append("avatar", avatarFile.value);

  const res = await apiFetch<{ data: { avatarUrl: string } }>(
    "/api/profile/avatar",
    {
      method: "POST",
      body: formData,
    },
  );

  profileStore.applyProfileUpdate({
    avatarUrl: res.data.avatarUrl,
  });

  avatarUploaded.value = true;
};

/* ================= SUBMIT ================= */
const submit = async () => {
  await handle(async () => {
    const payload: Record<string, any> = {};
    const original = profileStore.profile!;

    if (
      typeof user.firstName === "string" &&
      user.firstName.trim() !== "" &&
      user.firstName !== original.firstName
    ) {
      payload.firstName = user.firstName.trim();
    }

    if (
      typeof user.lastName === "string" &&
      user.lastName.trim() !== "" &&
      user.lastName !== original.lastName
    ) {
      payload.lastName = user.lastName.trim();
    }

    if (
      typeof user.phone === "string" &&
      user.phone.trim() !== "" &&
      user.phone !== original.phone
    ) {
      payload.phone = user.phone.trim();
    }

    await uploadAvatar();

    if (Object.keys(payload).length === 0 && !avatarUploaded.value) {
      throw new Error("No changes to update");
    }

    if (Object.keys(payload).length > 0) {
      await profileApi.updateProfile(payload);
      profileStore.applyProfileUpdate(payload);
    }

    await router.replace("/profile");
  }, toastSuccessUpdated("profile"));
};
</script>

<template>
  <FormShell
    title="Edit Profile"
    :loading="loading"
    submit-label="Update"
    @submit="submit"
    @cancel="router.replace('/profile')"
  >
    <FormSection>
      <!-- Email -->
      <div class="col-12">
        <label>Email</label>
        <input v-model="user.email" class="form-control" disabled />
      </div>

      <div class="col-6">
        <label>First Name</label>
        <input v-model="user.firstName" class="form-control" />
      </div>

      <div class="col-6">
        <label>Last Name</label>
        <input v-model="user.lastName" class="form-control" />
      </div>

      <div class="col-6">
        <label>Phone</label>
        <input v-model="user.phone" class="form-control" />
      </div>

      <div class="col-12">
        <label>Avatar</label>
        <input
          type="file"
          class="form-control"
          accept="image/*"
          @change="onAvatarChange"
        />
      </div>

      <div class="col-12">
        <img
          v-if="previewAvatar"
          :src="previewAvatar"
          class="rounded mt-2"
          style="width: 120px; height: 120px; object-fit: cover"
        />
      </div>

      <div class="col-6">
        <label>Region</label>
        <input v-model="user.region" class="form-control" disabled />
      </div>

      <div class="col-6">
        <label>Area</label>
        <input v-model="user.area" class="form-control" disabled />
      </div>
    </FormSection>
  </FormShell>
</template>
