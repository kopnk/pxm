const DETAIL_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  delay: "Delay",
  closed: "Closed",
  cancelled: "Cancelled",
};

export function detailStatusBadgeClass(value: string | null | undefined) {
  return {
    "bg-success": value === "active",
    "bg-warning text-dark": value === "delay",
    "bg-secondary": value === "closed" || !value,
    "bg-danger": value === "cancelled",
  };
}

export function detailStatusLabel(value: string | null | undefined) {
  if (value == null || value === "") return "—";
  return DETAIL_STATUS_LABELS[value] ?? value;
}
