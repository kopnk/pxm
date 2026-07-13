import type { NitroFetchOptions } from "nitropack";

/**
 * Central $fetch wrapper: cookies stay enabled for local proxy/API access.
 * Use from composables, plugins, and Pinia actions.
 */
export function apiFetch<T = unknown>(
  url: string,
  options?: NitroFetchOptions<string>,
): Promise<T> {
  const runtimeConfig = useRuntimeConfig();
  const baseURL = runtimeConfig.public.apiBaseUrl?.trim() || undefined;

  return $fetch(url, {
    baseURL,
    credentials: "include",
    ...options,
  }) as Promise<T>;
}
