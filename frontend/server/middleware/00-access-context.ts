import { defineEventHandler } from "h3";
import { resolveAccessContext } from "~/server/utils/accessContext";

export default defineEventHandler((event) => {
  const url = event.node.req.url || "";
  if (!url.startsWith("/api/")) return;

  event.context.accessContext = resolveAccessContext(event);
});
