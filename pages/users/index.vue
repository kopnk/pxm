<script setup lang="ts">
definePageMeta({
  middleware: ["superadmin"],
});

import { onMounted } from "vue";
import { useFormHandler } from "@/composables/useFormHandler";
import { toastSuccessDeleted } from "@/composables/useToastMessages";
const usersStore = useUsersStore();
const usersApi = useUsersApi();
const authStore = useAuthStore();
const { handle } = useFormHandler();

const rowNumber = (index: number) => {
  const page = usersStore.meta?.page ?? 1;
  const limit = usersStore.meta?.limit ?? 10;
  return (page - 1) * limit + index + 1;
};

onMounted(async () => {
  await usersApi.getUsers({ page: 1, limit: 10 });
});

const onDelete = async (id: string) => {
  const confirmed = confirm("Delete user?");
  if (!confirmed) return;

  await handle(async () => {
    await usersApi.deleteUser(id);
    await usersApi.getUsers({
      page: usersStore.meta?.page ?? 1,
      limit: usersStore.meta?.limit ?? 10,
    });
  }, toastSuccessDeleted("user"));
};
</script>

<template>
  <div class="container py-4">
    <div class="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
      <h4 class="text-brand mb-0">Users</h4>

      <NuxtLink
        v-if="authStore.user?.role === 'superadmin'"
        to="/users/signup"
        class="btn btn-primary"
      >
        + New user
      </NuxtLink>
    </div>

    <div class="card shadow-sm border-0">
      <div class="table-responsive">
        <table class="table table-sm table-striped table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th style="width: 60px">No</th>
              <th>Email</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Region</th>
              <th>Area</th>
              <th>Role</th>
              <th>Active</th>
              <th>Avatar URL</th>
              <th>Last login</th>
              <th>Created at</th>
              <th>Updated at</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="(u, index) in usersStore.items" :key="u.id">
              <td class="text-center">
                <NuxtLink
                  to="#"
                  class="text-danger text-decoration-none"
                  title="Delete user"
                  @click.prevent="onDelete(u.id)"
                >
                  {{ rowNumber(index) }}
                </NuxtLink>
              </td>

              <td>
                <NuxtLink
                  :to="`/users/update?id=${u.id}`"
                  class="text-decoration-none"
                >
                  {{ u.email }}
                </NuxtLink>
              </td>

              <td>{{ u.firstName }} {{ u.lastName }}</td>
              <td>{{ u.phone }}</td>
              <td>{{ u.region }}</td>
              <td>{{ u.area }}</td>
              <td>{{ u.role }}</td>
              <td>{{ u.isActive }}</td>
              <td>{{ u.avatarUrl }}</td>
              <td>{{ u.lastLoginAt }}</td>
              <td>{{ u.createdAt }}</td>
              <td>{{ u.updatedAt }}</td>
            </tr>

            <tr v-if="!usersStore.items.length">
              <td colspan="12" class="text-center text-muted py-4">No data</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
