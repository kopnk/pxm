import type { NitroFetchOptions } from "nitropack";

/**
 * Central $fetch wrapper: same-origin cookies for Lucia session.
 * Use from composables, plugins, and Pinia actions.
 */
export function apiFetch<T = unknown>(
  url: string,
  options?: NitroFetchOptions<string>,
): Promise<T> {
  return $fetch(url, {
    credentials: "include",
    ...options,
  }) as Promise<T>;
}
