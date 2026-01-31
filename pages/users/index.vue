<script setup lang="ts">
definePageMeta({
  middleware: ["superadmin"],
});
import { onMounted } from "vue";

const usersStore = useUsersStore();
const usersApi = useUsersApi();
const authStore = useAuthStore();

onMounted(async () => {
  await usersApi.getUsers({ page: 1, limit: 10 });
});

const onDelete = async (id: string) => {
  if (!confirm("Delete user?")) return;

  // delete + mutasi state sudah dilakukan di store
  await usersStore.deleteUser(id);

  // LOGIC EXISTING TETAP:
  // reload data agar pagination & meta tetap konsisten
  await usersApi.getUsers({
    page: usersStore.meta?.page ?? 1,
    limit: usersStore.meta?.limit ?? 10,
  });
};
</script>

<template>
  <div>
    <h3>
      <NuxtLink
        v-if="authStore.user?.role === 'superadmin'"
        to="/users/signup"
        class="text-decoration-none"
      >
        +Users
      </NuxtLink>

      <span v-else>Users</span>
    </h3>

    <table class="table table-bordered table-striped">
      <thead>
        <tr>
          <th style="width: 60px">No</th>
          <th>Email</th>
          <th>Name</th>
          <th>Phone</th>
          <th>Region</th>
          <th>Area</th>
          <th>Role</th>
          <th>Active</th>
          <th>Avatar Url</th>
          <th>Last Login</th>
          <th>Created At</th>
          <th>Updated At</th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="(u, index) in usersStore.items" :key="u.id">
          <!-- No + Delete -->
          <td class="text-center">
            <NuxtLink
              to="#"
              class="text-danger text-decoration-none"
              title="Delete user"
              @click.prevent="onDelete(u.id)"
            >
              {{
                (usersStore.meta?.page! - 1) * usersStore.meta?.limit! +
                index +
                1
              }}
            </NuxtLink>
          </td>

          <!-- Email = Edit link -->
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
          <td colspan="12" class="text-center">No data</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
