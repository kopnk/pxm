import { defineEventHandler, createError } from "h3";
import { resolvePartnerPoPdfReference } from "~/server/utils/partnerPoPdfAccess";
import { resolvePartnerPoPdfSecret } from "~/server/utils/partnerPoPdfSecret";
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
  if (pathOnly === "/api/reports/partner-po-pdf") {
    const config = useRuntimeConfig(event);
    const secret = await resolvePartnerPoPdfSecret(config.partnerPoPdfSecret);
    const reference = resolvePartnerPoPdfReference(
      {
        po: pdfParams.get("po"),
        ref: pdfParams.get("ref"),
        access: pdfParams.get("access"),
      },
      secret,
    );

    if (reference.verifiedPo) {
      event.context.signedPartnerPoPdfAccess = { po: reference.verifiedPo };
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
