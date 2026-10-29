<script setup lang="ts">
import { isNavGroupEntry, type NavLink } from "~/composables/useAppNavigation";
import { resolveAvatarUrl } from "~/utils/resolveAvatarUrl";

const collapsed = defineModel<boolean>("collapsed", { default: false });

const auth = useAuthStore();
const route = useRoute();
const { logout } = useAppLogout();
const { groups, accountLinks, bottomLinks, isActive, activeLabel } = useAppNavigation();

const user = computed(() => auth.user);
const displayName = computed(() => user.value?.firstName || user.value?.email || "Guest");
const avatarUrl = computed(() => resolveAvatarUrl(user.value?.avatarUrl));

/* ---------- expandable entries (Taxes, account) ---------- */
const openGroups = ref(new Set<string>());
const accountOpen = ref(false);

const hasActiveChild = (children: NavLink[]) => children.some((child) => isActive(child));
const isGroupOpen = (label: string, children: NavLink[]) =>
  openGroups.value.has(label) || hasActiveChild(children);

function toggleGroup(label: string, children: NavLink[]) {
  // A collapsed rail has no room for sub-items: expand it first.
  if (collapsed.value) {
    collapsed.value = false;
    openGroups.value = new Set([...openGroups.value, label]);
    return;
  }
  const next = new Set(openGroups.value);
  if (isGroupOpen(label, children)) next.delete(label);
  else next.add(label);
  openGroups.value = next;
}

function toggleAccount() {
  if (collapsed.value) {
    collapsed.value = false;
    accountOpen.value = true;
    return;
  }
  accountOpen.value = !accountOpen.value;
}

/* ---------- mobile drawer ---------- */
const drawerOpen = ref(false);
const menuButton = ref<HTMLButtonElement | null>(null);
const closeButton = ref<HTMLButtonElement | null>(null);

async function openDrawer(section?: "account") {
  if (section === "account") accountOpen.value = true;
  drawerOpen.value = true;
  await nextTick();
  closeButton.value?.focus();
}

function closeDrawer(restoreFocus = true) {
  if (!drawerOpen.value) return;
  drawerOpen.value = false;
  if (restoreFocus) menuButton.value?.focus();
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && drawerOpen.value) closeDrawer();
}

onMounted(() => document.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => document.removeEventListener("keydown", onKeydown));

watch(
  () => route.fullPath,
  () => {
    closeDrawer(false);
    accountOpen.value = false;
  },
);

async function handleLogout() {
  closeDrawer(false);
  await logout();
}
</script>

<template>
  <header class="app-topbar">
    <button
      ref="menuButton"
      type="button"
      class="app-icon-btn"
      aria-label="Open navigation"
      aria-controls="app-sidebar"
      :aria-expanded="drawerOpen"
      @click="openDrawer()"
    >
      <NavIcon name="menu" />
    </button>

    <NuxtLink to="/" class="app-topbar-brand">
      <img src="/pwa-192.png" alt="" width="32" height="32" />
      <span class="app-topbar-title">{{ activeLabel }}</span>
    </NuxtLink>

    <button
      v-if="user"
      type="button"
      class="app-avatar-btn"
      aria-label="Account menu"
      aria-controls="app-sidebar"
      @click="openDrawer('account')"
    >
      <img :src="avatarUrl" alt="" width="32" height="32" />
    </button>
  </header>

  <div v-if="drawerOpen" class="app-backdrop" aria-hidden="true" @click="closeDrawer()" />

  <aside id="app-sidebar" class="app-sidebar" :class="{ 'is-open': drawerOpen }">
    <div class="app-sidebar-head">
      <NuxtLink to="/" class="app-brand" :title="collapsed ? 'PXM' : undefined">
        <img src="/pwa-192.png" alt="" width="36" height="36" />
        <span class="app-brand-text">
          <strong>PXM</strong>
          <small>Projects eXecution Monitoring</small>
        </span>
      </NuxtLink>
      <button
        ref="closeButton"
        type="button"
        class="app-icon-btn app-drawer-close"
        aria-label="Close navigation"
        @click="closeDrawer()"
      >
        <NavIcon name="close" />
      </button>
    </div>

    <nav class="app-nav" aria-label="Main navigation">
      <section v-for="group in groups" :key="group.key" class="app-nav-group">
        <h2 class="app-nav-heading">{{ group.label }}</h2>
        <ul>
          <li v-for="entry in group.items" :key="entry.label">
            <template v-if="isNavGroupEntry(entry)">
              <button
                type="button"
                class="app-nav-link"
                :class="{ 'is-active': hasActiveChild(entry.children) }"
                :aria-expanded="isGroupOpen(entry.label, entry.children)"
                :title="collapsed ? entry.label : undefined"
                @click="toggleGroup(entry.label, entry.children)"
              >
                <NavIcon :name="entry.icon" />
                <span class="app-nav-label">{{ entry.label }}</span>
                <NavIcon name="chevron" :size="16" class="app-nav-caret" />
              </button>
              <ul v-show="isGroupOpen(entry.label, entry.children)" class="app-subnav">
                <li v-for="child in entry.children" :key="child.to">
                  <NuxtLink
                    :to="child.to"
                    class="app-nav-link app-subnav-link"
                    :class="{ 'is-active': isActive(child) }"
                    :aria-current="isActive(child) ? 'page' : undefined"
                  >
                    <span class="app-nav-label">{{ child.label }}</span>
                  </NuxtLink>
                </li>
              </ul>
            </template>

            <NuxtLink
              v-else
              :to="entry.to"
              class="app-nav-link"
              :class="{ 'is-active': isActive(entry) }"
              :aria-current="isActive(entry) ? 'page' : undefined"
              :title="collapsed ? entry.label : undefined"
            >
              <NavIcon :name="entry.icon" />
              <span class="app-nav-label">{{ entry.label }}</span>
            </NuxtLink>
          </li>
        </ul>
      </section>
    </nav>

    <div class="app-sidebar-foot">
      <div v-if="user" class="app-account">
        <ul v-show="accountOpen" id="app-account-menu" class="app-account-menu">
          <li v-for="link in accountLinks" :key="link.to">
            <NuxtLink
              :to="link.to"
              class="app-nav-link"
              :class="{ 'is-active': isActive(link) }"
              :aria-current="isActive(link) ? 'page' : undefined"
            >
              <NavIcon :name="link.icon" />
              <span class="app-nav-label">{{ link.label }}</span>
            </NuxtLink>
          </li>
          <li>
            <button type="button" class="app-nav-link app-nav-danger" @click="handleLogout">
              <NavIcon name="logout" />
              <span class="app-nav-label">Sign out</span>
            </button>
          </li>
        </ul>

        <button
          type="button"
          class="app-account-trigger"
          aria-controls="app-account-menu"
          :aria-expanded="accountOpen"
          :title="collapsed ? displayName : undefined"
          @click="toggleAccount"
        >
          <img :src="avatarUrl" alt="" width="36" height="36" class="app-account-avatar" />
          <span class="app-account-copy">
            <strong>{{ displayName }}</strong>
            <small>{{ user.role }}</small>
          </span>
          <NavIcon name="chevron" :size="16" class="app-nav-caret" />
        </button>
      </div>

      <button
        type="button"
        class="app-collapse-btn"
        :aria-pressed="collapsed"
        :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        :title="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="collapsed = !collapsed"
      >
        <NavIcon :name="collapsed ? 'expand' : 'collapse'" :size="18" />
        <span class="app-nav-label">Collapse</span>
      </button>
      <small class="app-sidebar-note">©pxm 2026 - ngopi</small>
    </div>
  </aside>

  <nav v-if="bottomLinks.length" class="app-bottombar" aria-label="Quick navigation">
    <NuxtLink
      v-for="link in bottomLinks"
      :key="link.to"
      :to="link.to"
      class="app-bottombar-link"
      :class="{ 'is-active': isActive(link) }"
      :aria-current="isActive(link) ? 'page' : undefined"
    >
      <NavIcon :name="link.icon" :size="22" />
      <span>{{ link.label }}</span>
    </NuxtLink>
    <button
      type="button"
      class="app-bottombar-link"
      aria-controls="app-sidebar"
      :aria-expanded="drawerOpen"
      @click="openDrawer()"
    >
      <NavIcon name="more" :size="22" />
      <span>Menu</span>
    </button>
  </nav>
</template>
