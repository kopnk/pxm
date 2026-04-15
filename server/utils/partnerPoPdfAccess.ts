import { createHmac, timingSafeEqual } from "node:crypto";

type TokenBody = { po: string; exp: number; sig: string };

function stableBody(po: string, exp: number) {
  return JSON.stringify({ po, exp });
}

/** Signed bearer for PDF URL (scan tanpa session jika `PARTNER_PO_PDF_SECRET` di-set). */
export function signPartnerPoAccess(
  po: string,
  secret: string,
  ttlSec = 90 * 24 * 60 * 60,
): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const body = stableBody(po, exp);
  const sig = createHmac("sha256", secret).update(body).digest("hex");
  const tokenObj: TokenBody = { po, exp, sig };
  return Buffer.from(JSON.stringify(tokenObj), "utf8").toString("base64url");
}

export function verifyPartnerPoAccess(
  token: string,
  secret: string,
): { po: string } | null {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const obj = JSON.parse(raw) as TokenBody;
    if (!obj?.po || typeof obj.exp !== "number" || typeof obj.sig !== "string") {
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
