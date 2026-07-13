export const RLS_ACTIONS = ["create", "read", "update", "delete"] as const;
export type RlsAction = (typeof RLS_ACTIONS)[number];

/** Default policy per role when a menu is first registered or merged into stored matrix. */
export type RlsDefaultPolicy = "full" | "cru" | "ru" | "r" | "u" | "none";

export type RlsMenuDefinition = {
  key: string;
  label: string;
  /** App route for page guard (omit for menu-only entries). */
  route?: string;
  adminDefault: RlsDefaultPolicy;
  staffDefault: RlsDefaultPolicy;
};

/**
 * Single registry — tambah 1 baris di sini saat ada menu baru;
 * matrix RLS, label kolom, dan default admin/staff ikut bertambah otomatis.
 */
export const RLS_MENU_REGISTRY = [
  {
    key: "dashboard",
    label: "Dashboard",
    route: "/",
    adminDefault: "ru",
    staffDefault: "r",
  },
  {
    key: "projects",
    label: "Projects",
    route: "/projects",
    adminDefault: "cru",
    staffDefault: "r",
  },
  {
    key: "project_details",
    label: "Details",
    route: "/project-details",
    adminDefault: "cru",
    staffDefault: "r",
  },
  {
    key: "project_progress",
    label: "Progress",
    route: "/project-progress",
    adminDefault: "cru",
    staffDefault: "ru",
  },
  {
    key: "progress_stage",
    label: "Progress Stage",
    route: "/progress-stage",
    adminDefault: "cru",
    staffDefault: "r",
  },
  {
    key: "project_financials",
    label: "Financial",
    route: "/project-financials",
    adminDefault: "cru",
    staffDefault: "r",
  },
  {
    key: "tax_in",
    label: "Tax In",
    route: "/project-financials/tax-in",
    adminDefault: "r",
    staffDefault: "r",
  },
  {
    key: "tax_out",
    label: "Tax Out",
    route: "/project-financials/tax-out",
    adminDefault: "r",
    staffDefault: "r",
  },
  {
    key: "pph",
    label: "Pph",
    route: "/project-financials/pph",
    adminDefault: "r",
    staffDefault: "r",
  },
  {
    key: "dcn",
    label: "Dcn",
    route: "/dcn",
    adminDefault: "cru",
    staffDefault: "cru",
  },
  {
    key: "profile",
    label: "Profile",
    route: "/profile",
    adminDefault: "ru",
    staffDefault: "ru",
  },
  {
    key: "change_password",
    label: "Change Password",
    route: "/profile/change-password",
    adminDefault: "ru",
    staffDefault: "ru",
  },
  {
    key: "users",
    label: "Users",
    route: "/users",
    adminDefault: "cru",
    staffDefault: "none",
  },
  {
    key: "clients",
    label: "Clients",
    route: "/clients",
    adminDefault: "cru",
    staffDefault: "r",
  },
  {
    key: "partners",
    label: "Partners",
    route: "/partners",
    adminDefault: "cru",
    staffDefault: "r",
  },
  {
    key: "regions",
    label: "Regions",
    route: "/regions",
    adminDefault: "cru",
    staffDefault: "r",
  },
  {
    key: "audit_log",
    label: "Audit Log",
    route: "/audit",
    adminDefault: "none",
    staffDefault: "none",
  },
] as const satisfies readonly RlsMenuDefinition[];

export type RlsResource = (typeof RLS_MENU_REGISTRY)[number]["key"];

export const RLS_RESOURCES = RLS_MENU_REGISTRY.map(
  (menu) => menu.key,
) as RlsResource[];

export type RlsMatrix = Record<RlsResource, Record<RlsAction, boolean>>;

const policyToActions = (
  policy: RlsDefaultPolicy,
): Record<RlsAction, boolean> => {
  switch (policy) {
    case "full":
      return { create: true, read: true, update: true, delete: true };
    case "cru":
      return { create: true, read: true, update: true, delete: false };
    case "ru":
      return { create: false, read: true, update: true, delete: false };
    case "r":
      return { create: false, read: true, update: false, delete: false };
    case "u":
      return { create: false, read: false, update: true, delete: false };
    default:
      return { create: false, read: false, update: false, delete: false };
  }
};

function buildMatrixFromRegistry(
  pickPolicy: (menu: (typeof RLS_MENU_REGISTRY)[number]) => RlsDefaultPolicy,
): RlsMatrix {
  return RLS_MENU_REGISTRY.reduce((acc, menu) => {
    acc[menu.key] = policyToActions(pickPolicy(menu));
    return acc;
  }, {} as RlsMatrix);
}

/** Admin tidak boleh delete di menu manapun (kebijakan tetap). */
/** Superadmin — full access on every registered menu. */
export function buildSuperadminMatrix(): RlsMatrix {
  return buildMatrixFromRegistry(() => "full");
}

/** Default admin template (derived from registry `adminDefault`). */
export function buildAdminDefaultMatrix(): RlsMatrix {
  return buildMatrixFromRegistry((menu) => menu.adminDefault);
}

/** Default staff template (derived from registry `staffDefault`). */
export function buildStaffDefaultMatrix(): RlsMatrix {
  return buildMatrixFromRegistry((menu) => menu.staffDefault);
}

export function defaultMatrixForRole(role: string): RlsMatrix {
  const normalized = role.toLowerCase();
  if (normalized === "superadmin") return buildSuperadminMatrix();
  if (normalized === "admin") return buildAdminDefaultMatrix();
  return buildStaffDefaultMatrix();
}

/**
 * Merge stored JSON with current registry.
 * Menu baru otomatis dapat default sesuai role user.
 */
export function normalizeRlsMatrix(
  input: Partial<RlsMatrix> | null | undefined,
  role?: string | null,
): RlsMatrix {
  const normalizedRole = role?.toLowerCase() ?? "staff";
  const base = defaultMatrixForRole(normalizedRole);

  for (const resource of RLS_RESOURCES) {
    for (const action of RLS_ACTIONS) {
      const allowed = input?.[resource]?.[action];
      if (typeof allowed === "boolean") {
        base[resource][action] = allowed;
      }
    }
  }

  return base;
}

export function hasRlsPermission(
  matrix: RlsMatrix | null | undefined,
  resource: RlsResource,
  action: RlsAction,
  role?: string | null,
): boolean {
  if (role?.toLowerCase() === "superadmin") return true;
  return Boolean(matrix?.[resource]?.[action]);
}

/** Map frontend routes to RLS resource. */
export const ROUTE_RLS_RESOURCE = RLS_MENU_REGISTRY.reduce(
  (acc, menu) => {
    if (menu.route) acc[menu.route] = menu.key;
    return acc;
  },
  {} as Record<string, RlsResource>,
);

export function resolveRouteRlsAction(path: string): RlsAction {
  const normalized = path.split("?")[0]?.replace(/\/+$/, "") || "/";
  if (
    normalized.includes("/create") ||
    normalized.endsWith("/signup") ||
    normalized.includes("/signup")
  ) {
    return "create";
  }
  if (
    normalized.includes("/update") ||
    normalized.includes("/change-password")
  ) {
    return "update";
  }
  return "read";
}

export function resolveRouteRlsResource(path: string): RlsResource | null {
  const normalized = path.split("?")[0]?.replace(/\/+$/, "") || "/";
  if (normalized === "/" || normalized === "") {
    return ROUTE_RLS_RESOURCE["/"] ?? null;
  }
  if (ROUTE_RLS_RESOURCE[normalized]) return ROUTE_RLS_RESOURCE[normalized];

  for (const [prefix, resource] of Object.entries(ROUTE_RLS_RESOURCE)) {
    if (prefix !== "/" && normalized.startsWith(`${prefix}/`)) {
      return resource;
    }
  }

  return null;
}
