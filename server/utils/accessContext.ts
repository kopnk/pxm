import type { H3Event } from "h3";
import { getRequestHeader } from "h3";

export type AccessDeviceType = "Desktop" | "Mobile" | "Tablet" | "Unknown";

export type AccessContext = {
  deviceType: AccessDeviceType;
  os: string;
  browser: string;
  ip: string;
};

const DEFAULT_ACCESS_CONTEXT: AccessContext = {
  deviceType: "Unknown",
  os: "Unknown",
  browser: "Unknown",
  ip: "Unknown",
};

export function resolveClientIp(event: H3Event): string {
  const forwarded = getRequestHeader(event, "x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return normalizeIp(first);
  }

  const realIp = getRequestHeader(event, "x-real-ip")?.trim();
  if (realIp) return normalizeIp(realIp);

  const socketIp = event.node?.req?.socket?.remoteAddress;
  if (socketIp) return normalizeIp(socketIp);

  return "Unknown";
}

function normalizeIp(value: string): string {
  return value.replace(/^::ffff:/, "");
}

export function parseUserAgent(userAgent: string): Pick<
  AccessContext,
  "deviceType" | "os" | "browser"
> {
  const ua = userAgent || "";

  let deviceType: AccessDeviceType = "Desktop";
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua)) {
    deviceType = "Tablet";
  } else if (/mobile|iphone|ipod|android.*mobile|windows phone/i.test(ua)) {
    deviceType = "Mobile";
  }

  let os = "Unknown";
  if (/windows nt 10/i.test(ua)) os = "Windows 10/11";
  else if (/windows nt 6\.3/i.test(ua)) os = "Windows 8.1";
  else if (/windows nt 6/i.test(ua)) os = "Windows 7/8";
  else if (/windows/i.test(ua)) os = "Windows";
  else if (/mac os x/i.test(ua)) os = "macOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
  else if (/cros/i.test(ua)) os = "Chrome OS";
  else if (/linux/i.test(ua)) os = "Linux";

  let browser = "Unknown";
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/opr\//i.test(ua) || /opera/i.test(ua)) browser = "Opera";
  else if (/chrome\//i.test(ua) && !/edg/i.test(ua)) browser = "Chrome";
  else if (/firefox\//i.test(ua)) browser = "Firefox";
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = "Safari";

  return { deviceType, os, browser };
}

export function resolveAccessContext(event?: H3Event): AccessContext {
  if (!event) return { ...DEFAULT_ACCESS_CONTEXT };

  const userAgent = getRequestHeader(event, "user-agent") ?? "";
  const parsed = parseUserAgent(userAgent);

  return {
    ...parsed,
    ip: resolveClientIp(event),
  };
}

export function serializeAccessContext(context: AccessContext): string {
  return JSON.stringify(context);
}

export function parseStoredAccessContext(
  stored: string | null | undefined,
): AccessContext {
  if (!stored) return { ...DEFAULT_ACCESS_CONTEXT };

  try {
    const parsed = JSON.parse(stored) as Partial<AccessContext>;
    if (parsed && typeof parsed === "object" && parsed.deviceType) {
      return {
        deviceType: parsed.deviceType ?? "Unknown",
        os: parsed.os ?? "Unknown",
        browser: parsed.browser ?? "Unknown",
        ip: parsed.ip ?? "Unknown",
      };
    }
  } catch {
    // legacy plain text values
  }

  if (stored === "Mobile Web") {
    return {
      deviceType: "Mobile",
      os: "Unknown",
      browser: "Unknown",
      ip: "Unknown",
    };
  }

  if (stored === "Web App") {
    return {
      deviceType: "Desktop",
      os: "Unknown",
      browser: "Unknown",
      ip: "Unknown",
    };
  }

  return { ...DEFAULT_ACCESS_CONTEXT };
}

export function formatAccessContextSummary(context: AccessContext): string {
  return `${context.deviceType} · ${context.os} · ${context.browser} · ${context.ip}`;
}
