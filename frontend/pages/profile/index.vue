<script setup lang="ts">
import { formatListTimestamp } from "@/utils/formatListTimestamp";
import { resolveAvatarUrl } from "@/utils/resolveAvatarUrl";

const profileApi = useProfileApi();
const profileStore = useProfileStore();

await profileApi.fetchProfile();

const profile = computed(() => profileStore.profile);
</script>

<template>
  <div class="container">
    <div class="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
      <h4 class="text-brand mb-0">My profile</h4>
      <NuxtLink to="/profile/update" class="btn btn-primary btn-sm">Edit profile</NuxtLink>
    </div>

    <div class="card">
      <div class="card-body p-4">
        <div class="d-flex flex-wrap align-items-center gap-3 pb-4 mb-3 border-bottom">
          <img
            :src="resolveAvatarUrl(profile?.avatarUrl)"
            alt=""
            width="72"
            height="72"
            class="rounded-circle border"
            style="object-fit: cover"
          />
          <div class="flex-grow-1 text-break">
            <div class="fs-5 fw-bold">
              {{ [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || "-" }}
            </div>
            <div class="data-meta text-break">{{ profile?.email }}</div>
          </div>
          <span
            class="badge ms-md-auto"
            :class="profile?.isActive ? 'bg-success' : 'bg-secondary'"
          >
            {{ profile?.isActive ? "Active" : "Inactive" }}
          </span>
        </div>

        <dl class="row mb-0 gy-3">
          <div class="col-sm-6 col-lg-4">
            <dt class="data-label">Region</dt>
            <dd class="data-value mb-0">{{ profile?.region || "-" }}</dd>
          </div>
          <div class="col-sm-6 col-lg-4">
            <dt class="data-label">Area</dt>
            <dd class="data-value mb-0">{{ profile?.area || "-" }}</dd>
          </div>
          <div class="col-sm-6 col-lg-4">
            <dt class="data-label">Phone</dt>
            <dd class="data-value mb-0">{{ profile?.phone || "-" }}</dd>
          </div>
          <div class="col-sm-6 col-lg-4">
            <dt class="data-label">Last login</dt>
            <dd class="data-value mb-0">{{ formatListTimestamp(profile?.lastLoginAt) }}</dd>
          </div>
          <div class="col-12">
            <dt class="data-label">Avatar URL</dt>
            <dd class="data-meta mb-0 text-break">{{ profile?.avatarUrl || "-" }}</dd>
          </div>
        </dl>
      </div>
    </div>
  </div>
</template>
