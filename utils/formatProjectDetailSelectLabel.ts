/** Label for select options: Site ID, Site Name, Material Name (API field names). */
export function formatProjectDetailSelectLabel(d: {
  siteId?: string | null;
  siteName?: string | null;
  materialName?: string | null;
}): string {
  const siteId = (d.siteId ?? "").trim() || "—";
  const siteName = (d.siteName ?? "").trim() || "—";
  const materialName = (d.materialName ?? "").trim() || "—";
  return `${siteId} — ${siteName} — ${materialName}`;
}
