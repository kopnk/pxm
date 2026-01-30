<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
});
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "~/stores/auth";

const store = useAuthStore();
const route = useRoute();
const router = useRouter();

const idUser = Number(route.query.id) || 0;
const user = ref<any>(null);
const showPassword = ref(false);

const form = ref({
  name: "",
  email: "",
  password: "",
  region: "",
  area: "",
  hp: "",
  role: "guest",
});

const message = ref("");
const error = ref("");

// Ambil data user
onMounted(async () => {
  if (idUser) {
    const res = await store.getUser(idUser);
    if (res) {
      user.value = res;
      form.value = {
        name: res.name || "",
        email: res.email || "",
        password: "",
        region: res.region || "",
        area: res.area || "",
        hp: res.hp || "",
        role: res.role || "guest",
      };
    }
  }
});

// ✅ Update user dan redirect otomatis
const updateUser = async () => {
  error.value = "";
  message.value = "";

  if (
    !form.value.name ||
    !form.value.email ||
    !form.value.region ||
    !form.value.area ||
    !form.value.hp ||
    !form.value.role
  ) {
    error.value = "All fields are required!";
    return;
  }

  try {
    const res = await store.update({
      idUser,
      ...form.value,
    });

    console.log("Update response:", res);

    if (res?.message && /updated/i.test(res.message)) {
      message.value = "✅ User successfully updated";
      await new Promise((r) => setTimeout(r, 1000)); // jeda biar notif sempat tampil
      router.push("/users/list"); // langsung ganti halaman
    } else {
      error.value = res?.message || "Failed to update user!";
    }
  } catch (err) {
    console.error("User update error:", err);
    error.value = "An error occurred during update!";
  }
};
</script>

<template>
  <div class="form-global">
    <div v-if="user" class="form-box-global">
      <h2>- EDIT -</h2>
      <form @submit.prevent="updateUser">
        <div class="form-group">
          <label>Full Name</label>
          <input v-model="form.name" type="text" />
        </div>

        <div class="form-group">
          <label>Email</label>
          <input v-model="form.email" type="email" />
        </div>

        <div class="form-group">
          <label>Region</label>
          <input v-model="form.region" type="text" />
        </div>

        <div class="form-group">
          <label>Area</label>
          <input v-model="form.area" type="text" />
        </div>

        <div class="form-group">
          <label>HP</label>
          <input v-model="form.hp" type="text" />
        </div>

        <div class="form-group">
          <label>Role</label>
          <select v-model="form.role">
            <option value="guest">Guest</option>
            <option value="admin">Admin</option>
            <option value="superadmin">Superadmin</option>
          </select>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary">💾Save</button>
          <button
            type="button"
            class="btn btn-secondary"
            @click="router.back()"
          >
            Cancel
          </button>
        </div>
      </form>

      <!-- pesan status -->
      <p v-if="message" class="text-success mt-2">{{ message }}</p>
      <p v-if="error" class="text-danger mt-2">{{ error }}</p>
    </div>

    <div v-else>
      <p class="text-center mt-4">Loading user data...</p>
    </div>
  </div>
</template>
