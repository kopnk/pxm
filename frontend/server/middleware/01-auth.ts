import { defineEventHandler, createError, getQuery } from "h3";
import { resolvePartnerPoPdfReference } from "~/server/utils/partnerPoPdfAccess";
import { resolvePartnerPoPdfSecret } from "~/server/utils/partnerPoPdfSecret";
import {
  isCognitoAuthEnabled,
  resolveAuthSession,
} from "~/server/utils/cognitoAuth";
import {
  isPasswordChangeApiCall,
  isPublicApiPath,
  requestMethod,
  resolveApiPath,
} from "~/server/utils/apiPath";

const queryValue = (value: unknown) =>
  typeof value === "string" ? value : null;

export default defineEventHandler(async (event) => {
  const path = resolveApiPath(event);
  if (!path || isPublicApiPath(path)) return;

  if (path === "/api/reports/partner-po-pdf") {
    const query = getQuery(event);
    const config = useRuntimeConfig(event);
    const secret = await resolvePartnerPoPdfSecret(config.partnerPoPdfSecret);
    const reference = resolvePartnerPoPdfReference(
      {
        po: queryValue(query.po),
        ref: queryValue(query.ref),
        access: queryValue(query.access),
        projectId: queryValue(query.projectId),
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

  const mustChangePassword = Boolean(authSession.appUser.user.mustChangePassword);

  // Users holding a temporary password may only finish the password change.
  // The UI already redirects them; this keeps the API consistent with it.
  if (mustChangePassword && !isPasswordChangeApiCall(path, requestMethod(event))) {
    throw createError({ statusCode: 403, statusMessage: "Password change required" });
  }

  event.context.user = {
    id: authSession.appUser.user.id,
    email: authSession.appUser.user.email,
    role: authSession.appUser.user.role ?? "staff",
    isActive: Boolean(authSession.appUser.user.isActive),
    mustChangePassword,
  };
  event.context.session = authSession.state;
  event.context.permissions = authSession.appUser.permissions;
});
