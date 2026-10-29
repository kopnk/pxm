import { defineEventHandler } from "h3";
import { resolveAccessContext } from "~/server/utils/accessContext";
import { resolveApiPath } from "~/server/utils/apiPath";

export default defineEventHandler((event) => {
  if (!resolveApiPath(event)) return;

  event.context.accessContext = resolveAccessContext(event);
});
