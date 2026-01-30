<script setup lang="ts">
const profileStore = useProfileStore();

// fetch sekali (cached)
await profileStore.fetchProfile();

const profile = computed(() => profileStore.profile);
</script>

<template>
  <div class="card">
    <div class="card-body">
      <h5>My Profile</h5>

      <table class="table table-sm">
        <tbody>
          <tr>
            <th>Email</th>
            <td>
              <NuxtLink to="/profile/update">
                {{ profile.email }}
              </NuxtLink>
            </td>
          </tr>

          <tr>
            <th>First Name</th>
            <td>{{ profile.firstName }}</td>
          </tr>

          <tr>
            <th>Last Name</th>
            <td>{{ profile.lastName }}</td>
          </tr>

          <tr>
            <th>Region</th>
            <td>{{ profile.region }}</td>
          </tr>

          <tr>
            <th>Area</th>
            <td>{{ profile.area }}</td>
          </tr>

          <tr>
            <th>Role</th>
            <td>{{ profile.role }}</td>
          </tr>

          <tr>
            <th>Phone</th>
            <td>{{ profile.phone }}</td>
          </tr>

          <tr>
            <th>Active</th>
            <td>{{ profile.isActive ? "Yes" : "No" }}</td>
          </tr>

          <tr>
            <th>Last Login</th>
            <td>{{ profile.lastLoginAt }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
