<script setup lang="ts">
const auth = useAuthStore();
const route = useRoute();
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

const taxesMenuActive = computed(() =>
  /^\/project-financials\/(tax-in|tax-out|pph)/.test(route.path),
);
</script>

<template>
  <nav class="navbar navbar-expand-lg navbar-dark header">
    <div class="container">
      <NuxtLink to="/" class="navbar-brand d-flex align-items-center fw-bold">
        PXM
      </NuxtLink>

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

      <div class="collapse navbar-collapse" id="mainNavbar">
        <ul class="navbar-nav me-auto mb-2 mb-lg-0">
          <li class="nav-item">
            <NuxtLink class="nav-link pxm-nav-link" to="/projects" active-class="active">
              <NavIcon name="projects" />
              <span>Projects</span>
            </NuxtLink>
          </li>
          <li class="nav-item">
            <NuxtLink
              class="nav-link pxm-nav-link"
              to="/project-details"
              active-class="active"
            >
              <NavIcon name="details" />
              <span>Details</span>
            </NuxtLink>
          </li>
          <li class="nav-item">
            <NuxtLink
              class="nav-link pxm-nav-link"
              to="/project-progress"
              active-class="active"
            >
              <NavIcon name="progress" />
              <span>Progress</span>
            </NuxtLink>
          </li>
          <li class="nav-item">
            <NuxtLink
              class="nav-link pxm-nav-link"
              to="/project-financials"
              active-class="active"
            >
              <NavIcon name="financial" />
              <span>Financial</span>
            </NuxtLink>
          </li>
          <li class="nav-item dropdown">
            <a
              class="nav-link pxm-nav-link dropdown-toggle"
              :class="{ active: taxesMenuActive }"
              href="#"
              role="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <NavIcon name="taxes" />
              <span>Taxes</span>
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
            <NuxtLink class="nav-link pxm-nav-link" to="/clients" active-class="active">
              <NavIcon name="clients" />
              <span>Clients</span>
            </NuxtLink>
          </li>
          <li class="nav-item">
            <NuxtLink class="nav-link pxm-nav-link" to="/partners" active-class="active">
              <NavIcon name="partners" />
              <span>Partner</span>
            </NuxtLink>
          </li>
          <li class="nav-item">
            <NuxtLink class="nav-link pxm-nav-link" to="/dcn" active-class="active">
              <NavIcon name="dcn" />
              <span>DCN</span>
            </NuxtLink>
          </li>
        </ul>

        <div v-if="user" class="dropdown">
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

<style scoped>
.pxm-nav-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: rgba(255, 255, 255, 0.92);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
  transition:
    color 0.16s ease,
    background-color 0.16s ease;
  border-radius: 0.35rem;
  padding-inline: 0.65rem;
}

.pxm-nav-link.active {
  color: #ffffff;
  background-color: rgba(255, 255, 255, 0.2);
  font-weight: 600;
}

@media (hover: hover) and (pointer: fine) {
  .pxm-nav-link:hover {
    color: #fff9c4;
    background-color: rgba(255, 255, 255, 0.14);
  }

  .pxm-nav-link.active:hover {
    color: #ffffff;
  }
}

.navbar-brand {
  color: #212529 !important;
}

@media (prefers-reduced-motion: reduce) {
  .pxm-nav-link {
    transition: none;
  }
}
</style>
