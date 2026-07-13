import {
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminInitiateAuthCommand,
  AdminRespondToAuthChallengeCommand,
  AdminSetUserPasswordCommand,
  AdminUserGlobalSignOutCommand,
  ChangePasswordCommand,
  CognitoIdentityProviderClient,
  GetUserCommand,
  type AttributeType,
} from "@aws-sdk/client-cognito-identity-provider";
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  createError,
  deleteCookie,
  getCookie,
  setCookie,
  type H3Event,
} from "h3";
import { getAwsRegion } from "~/server/utils/appFilesStorage";
import {
  type AppUserRecord,
  getAppUserRecordByEmail,
} from "~/server/utils/appUserStore";

export const AUTH_COOKIE_NAME = "pxm_session";

type ActiveAuthState = {
  type: "active";
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  email: string;
};

type ChallengeAuthState = {
  type: "challenge";
  email: string;
  username: string;
  session: string;
};

export type AuthState = ActiveAuthState | ChallengeAuthState;

export type ResolvedAuthSession =
  | {
      kind: "active";
      state: ActiveAuthState;
      cognito: {
        username: string;
        email: string;
        sub?: string | null;
        attributes: AttributeType[];
      };
      appUser: AppUserRecord;
    }
  | {
      kind: "challenge";
      state: ChallengeAuthState;
      appUser: AppUserRecord;
    };

let cognitoClient: CognitoIdentityProviderClient | null = null;

function cognitoErrorName(error: unknown) {
  return typeof error === "object" && error && "name" in error
    ? String((error as { name?: string }).name)
    : "";
}

function cognitoErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "AWS Cognito request failed";
}

function isUnauthorizedSessionError(error: unknown) {
  const name = cognitoErrorName(error);
  const statusCode =
    typeof error === "object" && error && "statusCode" in error
      ? Number((error as { statusCode?: number }).statusCode)
      : 0;

  return (
    statusCode === 401 ||
    name === "NotAuthorizedException" ||
    name === "UserNotFoundException"
  );
}

function nowUnixSeconds() {
  return Math.floor(Date.now() / 1000);
}

function getCookieSecret() {
  const secret = process.env.AWS_AUTH_COOKIE_SECRET?.trim();
  if (!secret) {
    throw new Error("AWS_AUTH_COOKIE_SECRET is missing or empty.");
  }

  return secret;
}

function getUserPoolId() {
  const userPoolId = process.env.AWS_COGNITO_USER_POOL_ID?.trim();
  if (!userPoolId) {
    throw new Error("AWS_COGNITO_USER_POOL_ID is missing or empty.");
  }

  return userPoolId;
}

function getClientId() {
  const clientId =
    process.env.AWS_COGNITO_CLIENT_ID?.trim() ||
    process.env.COGNITO_USER_POOL_CLIENT_ID?.trim();
  if (!clientId) {
    throw new Error("AWS_COGNITO_CLIENT_ID is missing or empty.");
  }

  return clientId;
}

function getCognitoClient() {
  if (!cognitoClient) {
    cognitoClient = new CognitoIdentityProviderClient({
      region: getAwsRegion(),
    });
  }

  return cognitoClient;
}

function cookieSignature(payload: string) {
  return createHmac("sha256", getCookieSecret()).update(payload).digest("base64url");
}

function toCookieValue(state: AuthState) {
  const payload = Buffer.from(JSON.stringify(state), "utf8").toString("base64url");
  return `${payload}.${cookieSignature(payload)}`;
}

function fromCookieValue(value?: string | null): AuthState | null {
  if (!value) return null;

  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const expectedSignature = cookieSignature(payload);
  const valid =
    signature.length === expectedSignature.length &&
    timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));

  if (!valid) return null;

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AuthState;
  } catch {
    return null;
  }
}

function sessionCookieAttributes(maxAge?: number) {
  return {
    httpOnly: true,
    secure: process.env.SESSION_COOKIE_SECURE === "true",
    sameSite: "strict" as const,
    path: "/",
    maxAge,
  };
}

function getAttributeValue(
  attributes: AttributeType[] | undefined,
  name: string,
) {
  return attributes?.find((attribute) => attribute.Name === name)?.Value ?? null;
}

export function isCognitoAuthEnabled() {
  return Boolean(
    process.env.AWS_COGNITO_USER_POOL_ID?.trim() &&
      process.env.AWS_COGNITO_CLIENT_ID?.trim() &&
      process.env.AWS_AUTH_COOKIE_SECRET?.trim(),
  );
}

export function readAuthState(event: H3Event) {
  return fromCookieValue(getCookie(event, AUTH_COOKIE_NAME));
}

export function clearAuthState(event: H3Event) {
  deleteCookie(event, AUTH_COOKIE_NAME, sessionCookieAttributes(0));
}

export function writeAuthState(event: H3Event, state: AuthState) {
  const maxAge = state.type === "active"
    ? state.refreshToken
      ? 30 * 24 * 60 * 60
      : Math.max(state.expiresAt - nowUnixSeconds(), 60)
    : 15 * 60;

  setCookie(
    event,
    AUTH_COOKIE_NAME,
    toCookieValue(state),
    sessionCookieAttributes(maxAge),
  );
}

function toActiveState(params: {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  email: string;
}): ActiveAuthState {
  return {
    type: "active",
    accessToken: params.accessToken,
    refreshToken: params.refreshToken,
    expiresAt: nowUnixSeconds() + Math.max(params.expiresIn ?? 3600, 60),
    email: params.email.trim().toLowerCase(),
  };
}

async function getCognitoUser(accessToken: string) {
  const response = await getCognitoClient().send(
    new GetUserCommand({
      AccessToken: accessToken,
    }),
  );

  const email = getAttributeValue(response.UserAttributes, "email");
  if (!email?.trim()) {
    throw createError({
      statusCode: 401,
      statusMessage: "Authenticated user email is missing",
    });
  }

  return {
    username: response.Username ?? email,
    email: email.trim().toLowerCase(),
    sub: getAttributeValue(response.UserAttributes, "sub"),
    attributes: response.UserAttributes ?? [],
  };
}

function cognitoFromActiveState(state: ActiveAuthState) {
  return {
    username: state.email,
    email: state.email,
    sub: null,
    attributes: [
      {
        Name: "email",
        Value: state.email,
      },
    ],
  };
}

async function refreshActiveState(state: ActiveAuthState) {
  if (!state.refreshToken) {
    throw createError({ statusCode: 401, statusMessage: "Session expired" });
  }

  let response;
  try {
    response = await getCognitoClient().send(
      new AdminInitiateAuthCommand({
        UserPoolId: getUserPoolId(),
        ClientId: getClientId(),
        AuthFlow: "REFRESH_TOKEN_AUTH",
        AuthParameters: {
          REFRESH_TOKEN: state.refreshToken,
        },
      }),
    );
  } catch (error) {
    if (isUnauthorizedSessionError(error)) {
      throw createError({ statusCode: 401, statusMessage: "Session expired" });
    }

    throw error;
  }

  const accessToken = response.AuthenticationResult?.AccessToken;
  if (!accessToken) {
    throw createError({ statusCode: 401, statusMessage: "Session expired" });
  }

  return toActiveState({
    accessToken,
    refreshToken: state.refreshToken,
    expiresIn: response.AuthenticationResult?.ExpiresIn,
    email: state.email,
  });
}

export async function resolveAuthSession(
  event: H3Event,
): Promise<ResolvedAuthSession | null> {
  const state = readAuthState(event);
  if (!state) return null;

  if (state.type === "challenge") {
    const appUser = await getAppUserRecordByEmail(state.email);
    if (!appUser) {
      clearAuthState(event);
      return null;
    }

    return {
      kind: "challenge",
      state,
      appUser: {
        ...appUser,
        user: {
          ...appUser.user,
          mustChangePassword: true,
        },
      },
    };
  }

  let activeState = state;
  if (activeState.expiresAt <= nowUnixSeconds() + 60) {
    try {
      activeState = await refreshActiveState(activeState);
      writeAuthState(event, activeState);
    } catch (error) {
      if (isUnauthorizedSessionError(error)) {
        clearAuthState(event);
        return null;
      }

      throw error;
    }
  }

  const appUser = await getAppUserRecordByEmail(activeState.email);

  if (!appUser) {
    clearAuthState(event);
    return null;
  }

  return {
    kind: "active",
    state: activeState,
    cognito: cognitoFromActiveState(activeState),
    appUser,
  };
}

export async function loginWithPassword(email: string, password: string) {
  let response;
  try {
    response = await getCognitoClient().send(
      new AdminInitiateAuthCommand({
        UserPoolId: getUserPoolId(),
        ClientId: getClientId(),
        AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
        AuthParameters: {
          USERNAME: email.trim().toLowerCase(),
          PASSWORD: password,
        },
      }),
    );
  } catch (error) {
    const name = cognitoErrorName(error);

    if (name === "NotAuthorizedException" || name === "UserNotFoundException") {
      throw createError({
        statusCode: 401,
        statusMessage: "Invalid credentials",
      });
    }

    throw createError({
      statusCode: 500,
      statusMessage: cognitoErrorMessage(error),
    });
  }

  if (response.ChallengeName === "NEW_PASSWORD_REQUIRED" && response.Session) {
    return {
      state: {
        type: "challenge" as const,
        email: email.trim().toLowerCase(),
        username:
          response.ChallengeParameters?.USER_ID_FOR_SRP ||
          response.ChallengeParameters?.USERNAME ||
          email.trim().toLowerCase(),
        session: response.Session,
      },
      requiresPasswordChange: true,
    };
  }

  const accessToken = response.AuthenticationResult?.AccessToken;
  if (!accessToken) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid credentials",
    });
  }

  return {
    state: toActiveState({
      accessToken,
      refreshToken: response.AuthenticationResult?.RefreshToken,
      expiresIn: response.AuthenticationResult?.ExpiresIn,
      email,
    }),
    requiresPasswordChange: false,
  };
}

export async function completeNewPasswordChallenge(
  state: ChallengeAuthState,
  newPassword: string,
) {
  let response;
  try {
    response = await getCognitoClient().send(
      new AdminRespondToAuthChallengeCommand({
        UserPoolId: getUserPoolId(),
        ClientId: getClientId(),
        ChallengeName: "NEW_PASSWORD_REQUIRED",
        Session: state.session,
        ChallengeResponses: {
          USERNAME: state.username,
          NEW_PASSWORD: newPassword,
        },
      }),
    );
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: cognitoErrorMessage(error),
    });
  }

  const accessToken = response.AuthenticationResult?.AccessToken;
  if (!accessToken) {
    throw createError({
      statusCode: 400,
      statusMessage: "Password challenge could not be completed",
    });
  }

  return toActiveState({
    accessToken,
    refreshToken: response.AuthenticationResult?.RefreshToken,
    expiresIn: response.AuthenticationResult?.ExpiresIn,
    email: state.email,
  });
}

export async function changeOwnPassword(params: {
  accessToken: string;
  currentPassword: string;
  newPassword: string;
}) {
  try {
    await getCognitoClient().send(
      new ChangePasswordCommand({
        AccessToken: params.accessToken,
        PreviousPassword: params.currentPassword,
        ProposedPassword: params.newPassword,
      }),
    );
  } catch (error) {
    const name = cognitoErrorName(error);

    if (name === "NotAuthorizedException") {
      throw createError({
        statusCode: 400,
        statusMessage: "Current password is incorrect",
      });
    }

    throw createError({
      statusCode: 400,
      statusMessage: cognitoErrorMessage(error),
    });
  }
}

export async function signOutActiveSession(state: ActiveAuthState) {
  const cognito = await getCognitoUser(state.accessToken);
  await getCognitoClient().send(
    new AdminUserGlobalSignOutCommand({
      UserPoolId: getUserPoolId(),
      Username: cognito.username,
    }),
  );
}

export async function createCognitoUser(params: {
  email: string;
  firstName: string;
  lastName: string;
  temporaryPassword: string;
}) {
  try {
    await getCognitoClient().send(
      new AdminCreateUserCommand({
        UserPoolId: getUserPoolId(),
        Username: params.email.trim().toLowerCase(),
        TemporaryPassword: params.temporaryPassword,
        MessageAction: "SUPPRESS",
        UserAttributes: [
          {
            Name: "email",
            Value: params.email.trim().toLowerCase(),
          },
          {
            Name: "email_verified",
            Value: "true",
          },
          {
            Name: "given_name",
            Value: params.firstName,
          },
          {
            Name: "family_name",
            Value: params.lastName,
          },
        ],
      }),
    );
  } catch (error) {
    const name = cognitoErrorName(error);

    if (name === "UsernameExistsException") {
      throw createError({
        statusCode: 409,
        statusMessage: "Email already exists",
      });
    }

    throw createError({
      statusCode: 500,
      statusMessage: cognitoErrorMessage(error),
    });
  }
}

export async function deleteCognitoUser(email: string) {
  await getCognitoClient().send(
    new AdminDeleteUserCommand({
      UserPoolId: getUserPoolId(),
      Username: email.trim().toLowerCase(),
    }),
  );
}

export async function resetCognitoUserPassword(params: {
  email: string;
  temporaryPassword: string;
}) {
  return setCognitoUserPassword({
    email: params.email,
    password: params.temporaryPassword,
    permanent: false,
  });
}

export async function setCognitoUserPassword(params: {
  email: string;
  password: string;
  permanent?: boolean;
}) {
  try {
    await getCognitoClient().send(
      new AdminSetUserPasswordCommand({
        UserPoolId: getUserPoolId(),
        Username: params.email.trim().toLowerCase(),
        Password: params.password,
        Permanent: params.permanent ?? true,
      }),
    );
  } catch (error) {
    const name = cognitoErrorName(error);

    if (name === "UserNotFoundException") {
      throw createError({
        statusCode: 404,
        statusMessage: "User not found",
      });
    }

    throw createError({
      statusCode: 500,
      statusMessage: cognitoErrorMessage(error),
    });
  }
}
