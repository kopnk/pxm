<script setup lang="ts">
definePageMeta({
  layout: false,
});

import { ref } from "vue";
import { useRouter } from "#imports";

const router = useRouter();
const auth = useAuthStore();

const email = ref("");
const password = ref("");
const showPassword = ref(false);
const error = ref("");
const loading = ref(false);

const submit = async () => {
  error.value = "";
  loading.value = true;

  try {
    // 1️⃣ LOGIN (buat session + cookie)
    await $fetch("/api/auth/login", {
      method: "POST",
      body: {
        email: email.value,
        password: password.value,
      },
      credentials: "include",
    });

    // 2️⃣ AMBIL USER (ME)
    const me: any = await $fetch("/api/auth/me", {
      credentials: "include",
    });

    // 3️⃣ SET AUTH STATE (INI KUNCI UTAMA)
    auth.setUser(me.data.user);

    // 4️⃣ BARU PINDAH HALAMAN
    await router.push("/");
  } catch (e: any) {
    error.value = e?.data?.message || "Login failed";
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="signin-wrapper d-flex align-items-center justify-content-center">
    <div class="card signin-card shadow-sm">
      <div class="card-body p-4">
        <h4 class="text-center mb-4 fw-bold text-brand">PMS</h4>

        <form @submit.prevent="submit">
          <!-- Email -->
          <div class="mb-3">
            <label class="form-label">Email</label>
            <input
              v-model="email"
              type="email"
              class="form-control"
              placeholder="your@email.com"
              required
            />
          </div>

          <!-- Password -->
          <div class="mb-4 position-relative">
            <label class="form-label">Password</label>
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              class="form-control pe-5"
              placeholder="your password"
              required
            />

            <span
              class="password-toggle"
              @click="showPassword = !showPassword"
              :title="showPassword ? 'Hide password' : 'Show password'"
            >
              {{ showPassword ? "🙈" : "😶" }}
            </span>
          </div>

          <!-- Error -->
          <p v-if="error" class="text-danger small mb-2">
            {{ error }}
          </p>

          <!-- Button -->
          <div class="d-grid">
            <button class="btn btn-primary" :disabled="loading">
              {{ loading ? "Signing in…" : "🗝️ Sign In" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
