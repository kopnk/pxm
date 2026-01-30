<script setup lang="ts">
definePageMeta({
  middleware: ["auth", "superadmin"],
});
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "~/stores/auth";

const store = useAuthStore();
const router = useRouter();

// 🔧 State form
const name = ref("");
const email = ref("");
const password = ref("");
const role = ref("guest");
const region = ref("");
const area = ref("");
const hp = ref("");

const showPassword = ref(false);

const error = ref("");
const message = ref("");

// ✅ Validasi dasar
const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
const isNumeric = (val: string) => /^[0-9]+$/.test(val);

// 🧠 Validasi realtime
watch(email, (val) => {
  error.value = val && !isValidEmail(val) ? "Invalid email format" : "";
});

watch(hp, (val) => {
  error.value = val && !isNumeric(val) ? "Phone must be numeric" : "";
});

// 🚀 Submit form
const register = async () => {
  error.value = "";
  message.value = "";

  if (
    !name.value ||
    !email.value ||
    !password.value ||
    !role.value ||
    !region.value ||
    !area.value ||
    !hp.value
  ) {
    error.value = "All fields are required!";
    return;
  }

  if (!isValidEmail(email.value)) {
    error.value = "Invalid email format";
    return;
  }

  if (!isNumeric(hp.value)) {
    error.value = "Phone must be numeric";
    return;
  }

  try {
    const res = await store.signup({
      name: name.value,
      email: email.value,
      password: password.value,
      role: role.value,
      region: region.value,
      area: area.value,
      hp: hp.value,
    });

    if (res && !res.error) {
      message.value = "Registration successful!";
      setTimeout(() => router.push("/users/list"), 1200);
    } else {
      error.value = res?.error || "Registration failed!";
    }
  } catch (err) {
    console.error(err);
    error.value = "Something went wrong!";
  }
};
</script>

<template>
  <div class="form-global">
    <div class="form-box-global">
      <h2>- REGISTER -</h2>
      <form @submit.prevent="register">
        <div class="form-group">
          <label>Full Name</label>
          <input v-model="name" type="text" maxlength="50" />
        </div>

        <div class="form-group">
          <label>Email</label>
          <input v-model="email" type="email" maxlength="50" />
        </div>

        <div class="form-group">
          <label>Password</label>
          <div class="input-with-toggle">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              maxlength="20"
            />
            <span
              @click="showPassword = !showPassword"
              style="
                position: absolute;
                right: 0.75rem;
                top: 50%;
                transform: translateY(-50%);
                cursor: pointer;
                user-select: none;
                font-size: 1.2rem;
              "
            >
              {{ showPassword ? "😶" : "😑" }}
            </span>
          </div>
        </div>

        <div class="form-group">
          <label>Region</label>
          <input v-model="region" type="text" maxlength="50" />
        </div>

        <div class="form-group">
          <label>Area</label>
          <input v-model="area" type="text" maxlength="50" />
        </div>

        <div class="form-group">
          <label>Phone</label>
          <input v-model="hp" type="text" maxlength="15" />
        </div>

        <div class="form-group">
          <label>Role</label>
          <select v-model="role">
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
            @click="router.push('/users/list')"
          >
            Cancel
          </button>
        </div>
      </form>

      <p v-if="error" class="text-danger mt-2">{{ error }}</p>
      <p v-if="message" class="text-success mt-2">{{ message }}</p>
    </div>
  </div>
</template>
