import { defineEventHandler, createError } from "h3";
import { verifyPartnerPoAccess } from "~/server/utils/partnerPoPdfAccess";
import {
  isCognitoAuthEnabled,
  resolveAuthSession,
} from "~/server/utils/cognitoAuth";

export default defineEventHandler(async (event) => {
  const url = event.node.req.url || "";

  if (!url.startsWith("/api/")) {
    return;
  }

  if (url.startsWith("/api/auth/")) {
    return;
  }

  const pathOnly = url.split("?")[0] ?? "";
  if (pathOnly === "/api/health" || pathOnly === "/api/ready") {
    return;
  }

  const queryString = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";
  const pdfParams = new URLSearchParams(queryString);
  if (
    pathOnly === "/api/reports/partner-po-pdf" &&
    pdfParams.get("access")?.trim()
  ) {
    const config = useRuntimeConfig(event);
    const secret = String(config.partnerPoPdfSecret || "");
    const po = pdfParams.get("po")?.trim() ?? "";
    const access = pdfParams.get("access")?.trim() ?? "";
    const verified = secret ? verifyPartnerPoAccess(access, secret) : null;

    if (verified?.po === po) {
      event.context.signedPartnerPoPdfAccess = { po };
      return;
    }
  }

  if (!isCognitoAuthEnabled()) {
    throw createError({
      statusCode: 500,
      statusMessage: "Cognito auth configuration is required",
    });
  }

  const authSession = await resolveAuthSession(event);

  if (!authSession) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  if (!authSession.appUser.user.isActive) {
    throw createError({ statusCode: 403, statusMessage: "Forbidden" });
  }

  event.context.user = {
    id: authSession.appUser.user.id,
    email: authSession.appUser.user.email,
    role: authSession.appUser.user.role ?? "staff",
    isActive: Boolean(authSession.appUser.user.isActive),
    mustChangePassword: Boolean(authSession.appUser.user.mustChangePassword),
  };
  event.context.session = authSession.state;
  event.context.permissions = authSession.appUser.permissions;
});
