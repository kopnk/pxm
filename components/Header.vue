<script setup lang="ts">
const auth = useAuthStore();
const user = computed(() => auth.user);

async function handleLogout() {
  const { logout } = useAppLogout();

  await logout();
}

const displayName = computed(() =>
  user.value ? user.value.firstName : "Guest",
);

const avatarUrl = computed(
  () => user.value?.avatarUrl || "https://github.com/mdo.png",
);
</script>

<template>
  <nav class="navbar navbar-expand-lg navbar-dark header">
    <div class="container">
      <!-- BRAND / LOGO -->
      <NuxtLink to="/" class="navbar-brand fw-bold text-white"> PMS </NuxtLink>

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
            <NuxtLink class="nav-link" to="/details" active-class="active">
              Details
            </NuxtLink>
          </li>
          <li class="nav-item">
            <NuxtLink class="nav-link" to="/progress" active-class="active">
              Progress
            </NuxtLink>
          </li>
          <li class="nav-item">
            <NuxtLink class="nav-link" to="/financial" active-class="active">
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
          <li class="nav-item">
            <NuxtLink class="nav-link" to="/jsa" active-class="active">
              Jsa
            </NuxtLink>
          </li>
        </ul>

        <!-- SEARCH -->
        <form class="d-flex me-3 position-relative" role="search">
          <input
            class="form-control form-control-sm"
            type="search"
            placeholder="Search…"
            aria-label="Search"
          />
        </form>

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
