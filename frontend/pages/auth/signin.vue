<script setup lang="ts">
definePageMeta({
  layout: false,
});

import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "#imports";
import { apiFetch } from "~/utils/apiFetch";
import type { AuthSessionUser } from "~/stores/auth";
import type { RlsMatrix } from "~/lib/rls";

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const email = ref("");
const password = ref("");
const rememberEmail = ref(false);
const showPassword = ref(false);
const error = ref("");
const loading = ref(false);
const rememberedEmailKey = "pxm.remembered-email";

onMounted(() => {
  const rememberedEmail = localStorage.getItem(rememberedEmailKey)?.trim();
  if (rememberedEmail) {
    email.value = rememberedEmail;
    rememberEmail.value = true;
  }
});

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

    if (rememberEmail.value) {
      localStorage.setItem(rememberedEmailKey, email.value.trim());
    } else {
      localStorage.removeItem(rememberedEmailKey);
    }

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
  <main class="signin-wrapper">
    <section class="signin-panel">
      <div class="signin-card">
        <h2>Sign in</h2>
        <p class="text-muted small mb-4">Sign in with your PXM account.</p>

        <form :aria-busy="loading" @submit.prevent="submit">
          <div class="mb-3">
            <label for="signin-email" class="form-label">Email</label>
            <input
              id="signin-email"
              v-model="email"
              type="email"
              name="email"
              autocomplete="username"
              autocapitalize="none"
              inputmode="email"
              :aria-describedby="error ? 'signin-error' : undefined"
              class="form-control"
              placeholder="your@email.com"
              required
            />
          </div>

          <div class="mb-3 position-relative">
            <label for="signin-password" class="form-label">Password</label>
            <input
              id="signin-password"
              v-model="password"
              name="password"
              autocomplete="current-password"
              :aria-describedby="error ? 'signin-error' : undefined"
              :type="showPassword ? 'text' : 'password'"
              class="form-control pe-5"
              placeholder="your password"
              required
            />

            <button
              type="button"
              class="password-toggle btn btn-link text-decoration-none"
              @click="showPassword = !showPassword"
              :aria-label="showPassword ? 'Hide password' : 'Show password'"
              :aria-pressed="showPassword"
              aria-controls="signin-password"
              :title="showPassword ? 'Hide password' : 'Show password'"
            >
              {{ showPassword ? "Hide" : "Show" }}
            </button>
          </div>

          <div class="form-check mb-4">
            <input
              id="remember-email"
              v-model="rememberEmail"
              class="form-check-input"
              type="checkbox"
            />
            <label class="form-check-label" for="remember-email">
              Remember Email
            </label>
          </div>

          <div
            v-if="error"
            id="signin-error"
            role="alert"
            class="alert alert-danger py-2 px-3 small mb-3"
          >
            {{ error }}
          </div>

          <div class="d-grid">
            <button class="btn btn-primary" :disabled="loading">
              <span
                v-if="loading"
                class="spinner-border spinner-border-sm me-2"
                aria-hidden="true"
              />
              {{ loading ? "Signing in..." : "Sign In" }}
            </button>
          </div>
        </form>
      </div>
    </section>
  </main>
</template>
