<script setup lang="ts">
import { useFormHandler } from "@/composables/useFormHandler";
import { toastSuccessUpdated } from "@/composables/useToastMessages";
import FormShell from "@/components/form/FormShell.vue";
import FormSection from "@/components/form/FormSection.vue";
import { apiFetch } from "~/utils/apiFetch";
import { compressImageFile } from "~/utils/compressImage";
import { resolveAvatarUrl } from "~/utils/resolveAvatarUrl";

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

const onAvatarChange = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  // Resize before upload: a phone photo shrinks from several MB to ~100 KB.
  const compressed = await compressImageFile(file, { maxDimension: 512 });
  avatarFile.value = compressed;
  if (previewAvatar.value) URL.revokeObjectURL(previewAvatar.value);
  previewAvatar.value = URL.createObjectURL(compressed);
};

onBeforeUnmount(() => {
  if (previewAvatar.value) URL.revokeObjectURL(previewAvatar.value);
});

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
    <FormSection title="Account">
      <div class="col-12">
        <label for="profile-email">Email</label>
        <input id="profile-email" v-model="user.email" class="form-control" disabled />
      </div>

      <div class="col-md-6">
        <label for="profile-first-name">First Name</label>
        <input
          id="profile-first-name"
          v-model="user.firstName"
          class="form-control"
          autocomplete="given-name"
        />
      </div>

      <div class="col-md-6">
        <label for="profile-last-name">Last Name</label>
        <input
          id="profile-last-name"
          v-model="user.lastName"
          class="form-control"
          autocomplete="family-name"
        />
      </div>

      <div class="col-md-6">
        <label for="profile-phone">Phone</label>
        <input
          id="profile-phone"
          v-model="user.phone"
          class="form-control"
          type="tel"
          inputmode="tel"
          autocomplete="tel"
        />
      </div>

      <div class="col-md-3 col-6">
        <label for="profile-region">Region</label>
        <input id="profile-region" v-model="user.region" class="form-control" disabled />
      </div>

      <div class="col-md-3 col-6">
        <label for="profile-area">Area</label>
        <input id="profile-area" v-model="user.area" class="form-control" disabled />
      </div>
    </FormSection>

    <FormSection title="Avatar">
      <div class="col-12 d-flex flex-wrap align-items-center gap-3">
        <img
          :src="previewAvatar || resolveAvatarUrl(profileStore.profile?.avatarUrl)"
          alt=""
          width="72"
          height="72"
          class="rounded-circle border"
          style="object-fit: cover"
        />
        <div class="flex-grow-1">
          <label for="profile-avatar">Upload photo</label>
          <input
            id="profile-avatar"
            type="file"
            class="form-control"
            accept="image/png,image/jpeg,image/webp"
            aria-describedby="profile-avatar-help"
            @change="onAvatarChange"
          />
          <div id="profile-avatar-help" class="form-text">
            PNG, JPG, atau WebP. Foto otomatis diperkecil sebelum diunggah.
          </div>
        </div>
      </div>
    </FormSection>
  </FormShell>
</template>
