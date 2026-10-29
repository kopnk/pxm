import type { RlsResource } from "~/lib/rls";
import type { NavIconName } from "~/lib/navIcons";

export type NavLink = {
  label: string;
  to: string;
  icon: NavIconName;
  /** Read permission required to see the link. */
  resource?: RlsResource;
  superadminOnly?: boolean;
};

export type NavEntry = NavLink | (Omit<NavLink, "to"> & { children: NavLink[] });

export type NavGroup = {
  key: string;
  label: string;
  items: NavEntry[];
};

/**
 * Single navigation registry for the desktop sidebar, the mobile drawer and
 * the PWA bottom bar. Visibility follows the same RLS read checks as before.
 */
const NAV_GROUPS: NavGroup[] = [
  {
    key: "operations",
    label: "Operations",
    items: [
      { label: "Dashboard", to: "/", icon: "dashboard", resource: "dashboard" },
      { label: "Projects", to: "/projects", icon: "projects", resource: "projects" },
      { label: "Details", to: "/project-details", icon: "details", resource: "project_details" },
      { label: "Progress", to: "/project-progress", icon: "progress", resource: "project_progress" },
      { label: "Financial", to: "/project-financials", icon: "financial", resource: "project_financials" },
      {
        label: "Taxes",
        icon: "taxes",
        children: [
          { label: "Tax In", to: "/project-financials/tax-in", icon: "taxes", resource: "tax_in" },
          { label: "Tax Out", to: "/project-financials/tax-out", icon: "taxes", resource: "tax_out" },
          { label: "PPH", to: "/project-financials/pph", icon: "taxes", resource: "pph" },
        ],
      },
      { label: "DCN", to: "/dcn", icon: "dcn", resource: "dcn" },
    ],
  },
  {
    key: "master",
    label: "Master Data",
    items: [
      { label: "Clients", to: "/clients", icon: "clients", resource: "clients" },
      { label: "Partners", to: "/partners", icon: "partners", resource: "partners" },
      { label: "Regions", to: "/regions", icon: "regions", resource: "regions" },
      { label: "Stages", to: "/progress-stage", icon: "stages", resource: "progress_stage" },
    ],
  },
  {
    key: "admin",
    label: "Administration",
    items: [
      { label: "Users", to: "/users", icon: "users", resource: "users" },
      { label: "RLS", to: "/rls", icon: "rls", superadminOnly: true },
      { label: "Audit Log", to: "/audit", icon: "audit", resource: "audit_log" },
    ],
  },
];

const ACCOUNT_LINKS: NavLink[] = [
  { label: "Profile", to: "/profile", icon: "profile", resource: "profile" },
  { label: "Change Password", to: "/profile/change-password", icon: "key", resource: "change_password" },
];

/** Bottom bar candidates on phones, in priority order (max 4 shown). */
const BOTTOM_BAR_PATHS = ["/", "/projects", "/project-progress", "/project-financials", "/project-details", "/dcn"];

export const isNavGroupEntry = (
  entry: NavEntry,
): entry is Omit<NavLink, "to"> & { children: NavLink[] } => "children" in entry;

export function useAppNavigation() {
  const auth = useAuthStore();
  const route = useRoute();

  const canSee = (link: NavLink) => {
    if (link.superadminOnly) return auth.user?.role === "superadmin";
    return !link.resource || auth.canAccess(link.resource, "read");
  };

  const groups = computed(() =>
    NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items
        .map((entry) =>
          isNavGroupEntry(entry)
            ? { ...entry, children: entry.children.filter(canSee) }
            : entry,
        )
        .filter((entry) => (isNavGroupEntry(entry) ? entry.children.length > 0 : canSee(entry))),
    })).filter((group) => group.items.length > 0),
  );

  const accountLinks = computed(() => ACCOUNT_LINKS.filter(canSee));

  const allLinks = computed(() => [
    ...groups.value.flatMap((group) =>
      group.items.flatMap((entry) => (isNavGroupEntry(entry) ? entry.children : [entry])),
    ),
    ...accountLinks.value,
  ]);

  /** Longest matching route wins, so `/project-financials/pph` does not light up Financial. */
  const activePath = computed(() => {
    const path = route.path.replace(/\/+$/, "") || "/";
    let best = "";
    for (const link of allLinks.value) {
      const matches = link.to === "/" ? path === "/" : path === link.to || path.startsWith(`${link.to}/`);
      if (matches && link.to.length > best.length) best = link.to;
    }
    return best;
  });

  const isActive = (link: NavLink) => activePath.value === link.to;

  const activeLabel = computed(
    () => allLinks.value.find((link) => link.to === activePath.value)?.label ?? "PXM",
  );

  const bottomLinks = computed(() =>
    BOTTOM_BAR_PATHS.map((to) => allLinks.value.find((link) => link.to === to))
      .filter((link): link is NavLink => Boolean(link))
      .slice(0, 4),
  );

  return { groups, accountLinks, bottomLinks, isActive, activeLabel };
}
