<script setup lang="ts">
import type { RlsResource } from "~/lib/rls";

const auth = useAuthStore();
const route = useRoute();
const user = computed(() => auth.user);

const canRead = (resource: RlsResource) => auth.canAccess(resource, "read");

const showTaxesMenu = computed(
  () =>
    canRead("tax_in") ||
    canRead("tax_out") ||
    canRead("pph"),
);

const { logout } = useAppLogout();

async function handleLogout() {
  await logout();
}

const displayName = computed(() =>
  user.value ? user.value.firstName : "Guest",
);

const avatarUrl = computed(() =>
  !user.value?.avatarUrl || user.value.avatarUrl === "http://profile/update"
    ? "/default-avatar.svg"
    : user.value.avatarUrl,
);

const taxesMenuActive = computed(() =>
  /^\/project-financials\/(tax-in|tax-out|pph)/.test(route.path),
);
</script>

<template>
  <nav class="navbar navbar-expand-lg navbar-dark header pxm-navbar">
    <div class="container">
      <NuxtLink to="/" class="navbar-brand d-flex align-items-center fw-bold gap-2">
        <img
          src="/pwa-192.png"
          alt="PXM"
          width="44"
          height="44"
          class="pxm-brand-logo"
        />
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

      <div class="collapse navbar-collapse pxm-navbar-collapse" id="mainNavbar">
        <ul class="navbar-nav pxm-primary-nav me-auto mb-2 mb-lg-0">
          <li v-if="canRead('projects')" class="nav-item">
            <NuxtLink class="nav-link pxm-nav-link" to="/projects" active-class="active">
              <NavIcon name="projects" />
              <span>Projects</span>
            </NuxtLink>
          </li>
          <li v-if="canRead('project_details')" class="nav-item">
            <NuxtLink
              class="nav-link pxm-nav-link"
              to="/project-details"
              active-class="active"
            >
              <NavIcon name="details" />
              <span>Details</span>
            </NuxtLink>
          </li>
          <li v-if="canRead('project_progress')" class="nav-item">
            <NuxtLink
              class="nav-link pxm-nav-link"
              to="/project-progress"
              active-class="active"
            >
              <NavIcon name="progress" />
              <span>Progress</span>
            </NuxtLink>
          </li>
          <li v-if="canRead('project_financials')" class="nav-item">
            <NuxtLink
              class="nav-link pxm-nav-link"
              to="/project-financials"
              active-class="active"
            >
              <NavIcon name="financial" />
              <span>Financial</span>
            </NuxtLink>
          </li>
          <li v-if="showTaxesMenu" class="nav-item dropdown">
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
              <li v-if="canRead('tax_in')">
                <NuxtLink class="dropdown-item" to="/project-financials/tax-in">
                  Tax In
                </NuxtLink>
              </li>
              <li v-if="canRead('tax_out')">
                <NuxtLink
                  class="dropdown-item"
                  to="/project-financials/tax-out"
                >
                  Tax Out
                </NuxtLink>
              </li>
              <li v-if="canRead('pph')">
                <NuxtLink class="dropdown-item" to="/project-financials/pph">
                  PPH
                </NuxtLink>
              </li>
            </ul>
          </li>
          <li v-if="canRead('dcn')" class="nav-item">
            <NuxtLink class="nav-link pxm-nav-link" to="/dcn" active-class="active">
              <NavIcon name="dcn" />
              <span>DCN</span>
            </NuxtLink>
          </li>
        </ul>

        <div v-if="user" class="dropdown pxm-account">
          <button
            class="btn btn-link nav-link dropdown-toggle pxm-account-trigger d-flex align-items-center text-white text-decoration-none"
            data-bs-toggle="dropdown"
            type="button"
          >
            <img
              :src="avatarUrl"
              alt="user"
              width="32"
              height="32"
              class="rounded-circle pxm-account-avatar me-2"
            />
            <span class="pxm-account-copy text-start">
              <strong>{{ displayName }}</strong>
              <small>{{ user.role }}</small>
            </span>
          </button>

          <ul class="dropdown-menu dropdown-menu-end text-small pxm-account-menu">
            <li v-if="canRead('profile')">
              <NuxtLink
                class="dropdown-item"
                to="/profile"
                active-class="active"
              >
                Profile
              </NuxtLink>
            </li>

            <li v-if="canRead('change_password')">
              <NuxtLink
                class="dropdown-item"
                to="/profile/change-password"
                active-class="active"
              >
                Change Password
              </NuxtLink>
            </li>

            <li v-if="canRead('users')">
              <NuxtLink class="dropdown-item" to="/users" active-class="active">
                Users
              </NuxtLink>
            </li>

            <li v-if="user.role === 'superadmin'">
              <NuxtLink class="dropdown-item" to="/rls" active-class="active">
                RLS
              </NuxtLink>
            </li>

            <li v-if="canRead('clients')">
              <NuxtLink class="dropdown-item" to="/clients" active-class="active">
                Clients
              </NuxtLink>
            </li>

            <li v-if="canRead('partners')">
              <NuxtLink class="dropdown-item" to="/partners" active-class="active">
                Partner
              </NuxtLink>
            </li>

            <li v-if="canRead('regions')">
              <NuxtLink class="dropdown-item" to="/regions" active-class="active">
                Regions
              </NuxtLink>
            </li>

            <li v-if="canRead('progress_stage')">
              <NuxtLink
                class="dropdown-item"
                to="/progress-stage"
                active-class="active"
              >
                Stages
              </NuxtLink>
            </li>

            <li v-if="canRead('audit_log')">
              <NuxtLink class="dropdown-item" to="/audit" active-class="active">
                Audit Log
              </NuxtLink>
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

.pxm-brand-logo {
  display: block;
  width: 2.75rem;
  height: 2.75rem;
  object-fit: contain;
  border-radius: 0.8rem;
  filter: drop-shadow(0 0.3rem 0.45rem rgba(0, 0, 0, 0.2));
}

.pxm-account-copy {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}

.pxm-account-copy small {
  margin-top: 0.18rem;
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.72rem;
  font-weight: 500;
  text-transform: capitalize;
}

.pxm-account-avatar {
  border: 2px solid rgba(255, 255, 255, 0.75);
  box-shadow: 0 0.25rem 0.65rem rgba(0, 0, 0, 0.18);
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

@media (max-width: 991.98px) {
  .pxm-navbar {
    padding-block: 0.65rem;
  }

  .pxm-navbar .container {
    padding-inline: 0.85rem;
  }

  .navbar-toggler {
    width: 2.75rem;
    height: 2.75rem;
    padding: 0.55rem;
    border: 1px solid rgba(255, 255, 255, 0.38);
    border-radius: 0.9rem;
    background: rgba(12, 61, 109, 0.2);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.22);
  }

  .navbar-toggler:focus {
    box-shadow: 0 0 0 0.2rem rgba(255, 255, 255, 0.2);
  }

  .pxm-navbar-collapse {
    max-height: calc(100dvh - 5.5rem);
    margin-top: 0.75rem;
    padding: 0.8rem;
    overflow-y: auto;
    overscroll-behavior: contain;
    border: 1px solid rgba(255, 255, 255, 0.28);
    border-radius: 1.15rem;
    background:
      linear-gradient(145deg, rgba(8, 54, 96, 0.74), rgba(24, 111, 166, 0.58)),
      rgba(16, 66, 111, 0.68);
    box-shadow: 0 1rem 2rem rgba(7, 43, 75, 0.24);
    backdrop-filter: blur(18px) saturate(135%);
    -webkit-backdrop-filter: blur(18px) saturate(135%);
    scrollbar-width: thin;
  }

  .pxm-primary-nav {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.45rem;
    margin-bottom: 0.8rem !important;
  }

  .pxm-primary-nav .nav-item,
  .pxm-primary-nav .pxm-nav-link {
    width: 100%;
  }

  .pxm-primary-nav .pxm-nav-link {
    min-height: 3.1rem;
    padding: 0.72rem 0.8rem;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 0.85rem;
    background: rgba(255, 255, 255, 0.08);
  }

  .pxm-primary-nav .pxm-nav-link.active {
    color: #17324d;
    text-shadow: none;
    background: rgba(255, 255, 255, 0.94);
    border-color: rgba(255, 255, 255, 0.88);
    box-shadow: 0 0.45rem 0.9rem rgba(5, 39, 68, 0.14);
  }

  .pxm-primary-nav .dropdown-menu {
    position: static !important;
    grid-column: 1 / -1;
    width: 100%;
    margin-top: 0.4rem;
    padding: 0.45rem;
    border-radius: 0.85rem;
    background: rgba(255, 255, 255, 0.96);
  }

  .pxm-primary-nav .dropdown-item,
  .pxm-account-menu .dropdown-item {
    min-height: 2.65rem;
    padding: 0.62rem 0.75rem;
    border-radius: 0.65rem;
  }

  .pxm-account {
    padding-top: 0.75rem;
    border-top: 1px solid rgba(255, 255, 255, 0.18);
  }

  .pxm-account-trigger {
    width: 100%;
    min-height: 3.4rem;
    padding: 0.55rem 0.7rem !important;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 0.9rem;
    background: rgba(255, 255, 255, 0.1);
  }

  .pxm-account-trigger::after {
    margin-left: auto;
  }

  .pxm-account-menu {
    position: static !important;
    width: 100%;
    max-height: min(22rem, 45dvh);
    margin-top: 0.5rem !important;
    padding: 0.45rem;
    overflow-y: auto;
    border-radius: 0.9rem;
    background: rgba(255, 255, 255, 0.97);
    box-shadow: inset 0 0 0 1px rgba(22, 62, 96, 0.08) !important;
  }
}

@media (max-width: 420px) {
  .pxm-primary-nav {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pxm-nav-link {
    transition: none;
  }
}
</style>
