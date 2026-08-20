import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

type TokenBody = { po: string; exp: number; sig: string };
type PartnerPoPdfQuery = {
  po?: unknown;
  ref?: unknown;
  access?: unknown;
};

function stableBody(po: string, exp: number) {
  return JSON.stringify({ po, exp });
}

const OPAQUE_TOKEN_PREFIX = "v1";
const OPAQUE_TOKEN_AAD = Buffer.from("pxm-partner-po-pdf:v1", "utf8");
const MAX_PO_LENGTH = 128;
const MAX_TOKEN_LENGTH = 512;

function encryptionKey(secret: string) {
  return createHash("sha256").update(secret, "utf8").digest();
}

function isValidPayload(value: unknown): value is Pick<TokenBody, "po" | "exp"> {
  const payload = value as Partial<TokenBody> | null;
  return Boolean(
    payload &&
      typeof payload.po === "string" &&
      payload.po.length > 0 &&
      payload.po.length <= MAX_PO_LENGTH &&
      Number.isSafeInteger(payload.exp),
  );
}

/** Opaque encrypted PO reference. Authentication is enforced separately. */
export function signPartnerPoAccess(
  po: string,
  secret: string,
  ttlSec = 90 * 24 * 60 * 60,
): string {
  if (!po || po.length > MAX_PO_LENGTH || !secret || ttlSec <= 0) {
    throw new Error("Invalid partner PO PDF token input.");
  }

  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(secret), iv);
  cipher.setAAD(OPAQUE_TOKEN_AAD);
  const encrypted = Buffer.concat([
    cipher.update(stableBody(po, exp), "utf8"),
    cipher.final(),
  ]);
  return [
    OPAQUE_TOKEN_PREFIX,
    iv.toString("base64url"),
    encrypted.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
  ].join(".");
}

export function verifyPartnerPoAccess(
  token: string,
  secret: string,
): { po: string } | null {
  try {
    if (!token || token.length > MAX_TOKEN_LENGTH || !secret) return null;

    if (token.startsWith(`${OPAQUE_TOKEN_PREFIX}.`)) {
      const parts = token.split(".");
      if (parts.length !== 4) return null;
      const [version, encodedIv, encodedPayload, encodedTag] = parts;
      if (
        version !== OPAQUE_TOKEN_PREFIX ||
        !encodedIv ||
        !encodedPayload ||
        !encodedTag
      ) {
        return null;
      }

      const iv = Buffer.from(encodedIv, "base64url");
      const tag = Buffer.from(encodedTag, "base64url");
      if (iv.length !== 12 || tag.length !== 16) return null;

      const decipher = createDecipheriv(
        "aes-256-gcm",
        encryptionKey(secret),
        iv,
      );
      decipher.setAAD(OPAQUE_TOKEN_AAD);
      decipher.setAuthTag(tag);
      const raw = Buffer.concat([
        decipher.update(Buffer.from(encodedPayload, "base64url")),
        decipher.final(),
      ]).toString("utf8");
      const obj = JSON.parse(raw) as Pick<TokenBody, "po" | "exp">;
      if (!isValidPayload(obj)) return null;
      if (Math.floor(Date.now() / 1000) > obj.exp) return null;
      return { po: obj.po };
    }

    // Backward compatibility for the previous compact signed format.
    if (token.includes(".")) {
      const parts = token.split(".");
      if (parts.length !== 3) return null;
      const [encodedPo, encodedExp, sig] = parts;
      if (!encodedPo || !encodedExp || !sig) return null;

      const po = Buffer.from(encodedPo, "base64url").toString("utf8");
      const exp = Number.parseInt(encodedExp, 36);
      if (!isValidPayload({ po, exp })) return null;
      if (Math.floor(Date.now() / 1000) > exp) return null;

      const expected = createHmac("sha256", secret)
        .update(stableBody(po, exp))
        .digest("base64url");
      const a = Buffer.from(sig, "utf8");
      const b = Buffer.from(expected, "utf8");
      if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
      return { po };
    }

    // Backward compatibility for QR links generated before the compact format.
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const obj = JSON.parse(raw) as TokenBody;
    if (!isValidPayload(obj) || typeof obj.sig !== "string") {
      return null;
    }
    if (Math.floor(Date.now() / 1000) > obj.exp) return null;
    const body = stableBody(obj.po, obj.exp);
    const expected = createHmac("sha256", secret).update(body).digest("hex");
    const a = Buffer.from(obj.sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return { po: obj.po };
  } catch {
    return null;
  }
}

export function resolvePartnerPoPdfReference(
  query: PartnerPoPdfQuery,
  secret: string,
) {
  const poParam = String(query.po ?? "").trim();
  const accessToken =
    String(query.ref ?? query.access ?? "").trim() ||
    (poParam.startsWith(`${OPAQUE_TOKEN_PREFIX}.`) ? poParam : "");
  const verified = accessToken
    ? verifyPartnerPoAccess(accessToken, secret)
    : null;
  const requestedPo = poParam === accessToken ? "" : poParam;

  return {
    po: verified?.po || requestedPo,
    requestedPo,
    verifiedPo: verified?.po ?? "",
  };
}
