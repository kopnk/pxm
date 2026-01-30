<script setup>
definePageMeta({
  middleware: ["superadmin"],
});

const route = useRoute();
const id = route.params.id;

const { data } = useApi(`/api/users/${id}`);

const save = async () => {
  await useApi(`/api/users/${id}`, {
    method: "PUT",
    body: data.value,
  });
};

const remove = async () => {
  if (confirm("Delete user?")) {
    await useApi(`/api/users/${id}`, { method: "DELETE" });
    navigateTo("/users");
  }
};
</script>

<template>
  <div class="container mt-4">
    <h3>Edit User</h3>

    <input v-model="data.role" class="form-control mb-2" />
    <select v-model="data.is_active" class="form-control mb-2">
      <option :value="true">Active</option>
      <option :value="false">Inactive</option>
    </select>

    <button class="btn btn-primary me-2" @click="save">Save</button>
    <button class="btn btn-danger" @click="remove">Delete</button>
  </div>
</template>
