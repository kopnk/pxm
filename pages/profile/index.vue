<script setup lang="ts">
const profileApi = useProfileApi();
const profileStore = useProfileStore();

await profileApi.fetchProfile();

const profile = computed(() => profileStore.profile);
</script>

<template>
  <div class="container py-4">
    <div class="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
      <h4 class="text-brand mb-0">My profile</h4>
    </div>

    <div class="card shadow-sm border-0">
      <div class="card-body">
        <table class="table table-sm table-striped mb-0 align-middle">
          <tbody>
            <tr>
              <th class="text-muted" scope="row">Email</th>
              <td>
                <NuxtLink to="/profile/update" class="text-decoration-none">
                  {{ profile?.email }}
                </NuxtLink>
              </td>
            </tr>

            <tr>
              <th class="text-muted" scope="row">First name</th>
              <td>{{ profile?.firstName }}</td>
            </tr>

            <tr>
              <th class="text-muted" scope="row">Last name</th>
              <td>{{ profile?.lastName }}</td>
            </tr>

            <tr>
              <th class="text-muted" scope="row">Region</th>
              <td>{{ profile?.region }}</td>
            </tr>

            <tr>
              <th class="text-muted" scope="row">Area</th>
              <td>{{ profile?.area }}</td>
            </tr>

            <tr>
              <th class="text-muted" scope="row">Phone</th>
              <td>{{ profile?.phone }}</td>
            </tr>

            <tr>
              <th class="text-muted" scope="row">Avatar URL</th>
              <td>{{ profile?.avatarUrl }}</td>
            </tr>

            <tr>
              <th class="text-muted" scope="row">Active</th>
              <td>{{ profile?.isActive ? "Yes" : "No" }}</td>
            </tr>

            <tr>
              <th class="text-muted" scope="row">Last login</th>
              <td>{{ profile?.lastLoginAt }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
