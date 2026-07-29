<script setup lang="ts">
definePageMeta({
  layout: false,
});

import { ref } from "vue";
import { useRoute, useRouter } from "#imports";
import { apiFetch } from "~/utils/apiFetch";
import type { AuthSessionUser } from "~/stores/auth";
import type { RlsMatrix } from "~/lib/rls";

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const email = ref("");
const password = ref("");
const showPassword = ref(false);
const error = ref("");
const loading = ref(false);

const safeRedirectTarget = () => {
  const target = typeof route.query.redirect === "string"
    ? route.query.redirect
    : "";
  const safePath =
    target.startsWith("/") &&
    !target.startsWith("//") &&
    !target.includes("\\") &&
    !/[\r\n]/.test(target);
  return safePath ? target : "/";
};

const submit = async () => {
  error.value = "";
  loading.value = true;

  try {
    await apiFetch("/api/auth/login", {
      method: "POST",
      body: {
        email: email.value,
        password: password.value,
      },
    });

    const me = await apiFetch<{
      data: { user: AuthSessionUser; permissions?: RlsMatrix };
    }>("/api/auth/me");

    auth.setUser(me.data.user, me.data.permissions ?? me.data.user.permissions);

    if (me.data.user.mustChangePassword) {
      await router.push("/profile/change-password");
      return;
    }

    await router.push(safeRedirectTarget());
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
        <div class="text-center mb-4">
          <img src="/pxm.png" alt="PXM" height="78" />
        </div>

        <form @submit.prevent="submit">
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
              {{ showPassword ? "Hide" : "Show" }}
            </span>
          </div>

          <p v-if="error" class="text-danger small mb-2">
            {{ error }}
          </p>

          <div class="d-grid">
            <button class="btn btn-primary" :disabled="loading">
              {{ loading ? "Signing in..." : "Sign In" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
