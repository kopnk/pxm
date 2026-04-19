<script setup lang="ts">
const auth = useAuthStore();
const user = computed(() => auth.user);

const { logout } = useAppLogout();

async function handleLogout() {
  await logout();
}

const displayName = computed(() =>
  user.value ? user.value.firstName : "Guest",
);

const avatarUrl = computed(() =>
  !user.value?.avatarUrl || user.value.avatarUrl === "http://profile/update"
    ? "https://wbzgjchzffmgybtblxbj.supabase.co/storage/v1/object/public/avatars/default/default.jpg"
    : user.value.avatarUrl,
);
</script>

<template>
  <nav class="navbar navbar-expand-lg navbar-dark header">
    <div class="container">
      <!-- BRAND / LOGO -->
      <NuxtLink to="/" class="navbar-brand d-flex align-items-center fw-bold">
        PXM
      </NuxtLink>

      <!-- TOGGLER (MOBILE) -->
      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#mainNavbar"
        aria-controls="mainNavbar"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>

      <!-- MENU -->
      <div class="collapse navbar-collapse" id="mainNavbar">
        <!-- LEFT MENU -->
        <ul class="navbar-nav me-auto mb-2 mb-lg-0">
          <li class="nav-item">
            <NuxtLink class="nav-link" to="/projects" active-class="active">
              Projects
            </NuxtLink>
          </li>
          <li class="nav-item">
            <NuxtLink
              class="nav-link"
              to="/project-details"
              active-class="active"
            >
              Details
            </NuxtLink>
          </li>
          <li class="nav-item">
            <NuxtLink
              class="nav-link"
              to="/project-progress"
              active-class="active"
            >
              Progress
            </NuxtLink>
          </li>
          <li class="nav-item">
            <NuxtLink
              class="nav-link"
              to="/project-financials"
              active-class="active"
            >
              Financial
            </NuxtLink>
          </li>
          <li class="nav-item">
            <NuxtLink class="nav-link" to="/clients" active-class="active">
              Clients
            </NuxtLink>
          </li>
          <li class="nav-item">
            <NuxtLink class="nav-link" to="/partners" active-class="active">
              Partners
            </NuxtLink>
          </li>

          <li class="nav-item dropdown">
            <a
              class="nav-link dropdown-toggle"
              href="#"
              role="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              Taxes
            </a>
            <ul class="dropdown-menu">
              <li>
                <NuxtLink class="dropdown-item" to="/project-financials/tax-in">
                  Tax In
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  class="dropdown-item"
                  to="/project-financials/tax-out"
                >
                  Tax Out
                </NuxtLink>
              </li>
              <li>
                <NuxtLink class="dropdown-item" to="/project-financials/pph">
                  PPH
                </NuxtLink>
              </li>
            </ul>
          </li>
          <li class="nav-item">
            <NuxtLink class="nav-link" to="/dcn" active-class="active">
              DCN
            </NuxtLink>
          </li>
        </ul>

        <!-- USER DROPDOWN -->
        <div class="dropdown" v-if="user">
          <button
            class="btn btn-link nav-link dropdown-toggle d-flex align-items-center text-white text-decoration-none"
            data-bs-toggle="dropdown"
            type="button"
          >
            <img
              :src="avatarUrl"
              alt="user"
              width="32"
              height="32"
              class="rounded-circle me-2"
            />
            <strong>{{ displayName }}</strong>
          </button>

          <ul class="dropdown-menu dropdown-menu-end text-small">
            <li>
              <NuxtLink
                class="dropdown-item"
                to="/profile"
                active-class="active"
              >
                Profile
              </NuxtLink>
            </li>

            <li>
              <NuxtLink
                class="dropdown-item"
                to="/profile/change-password"
                active-class="active"
              >
                Change Password
              </NuxtLink>
            </li>

            <!-- hanya superadmin -->
            <li v-if="user.role === 'superadmin'">
              <NuxtLink class="dropdown-item" to="/users"> Users </NuxtLink>
            </li>

            <li><hr class="dropdown-divider" /></li>

            <li>
              <NuxtLink
                class="dropdown-item text-danger"
                to="#"
                @click.prevent="handleLogout"
              >
                Sign out
              </NuxtLink>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </nav>
</template>
