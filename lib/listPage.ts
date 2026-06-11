import { computed, watch, type WritableComputedRef } from "vue";
import { SEARCH_DEBOUNCE_MS } from "~/lib/pagination";

/** Two-way computed bound to a single key in a Pinia filters object. */
export function createStoreFilter<
  TFilters extends Record<string, unknown>,
  K extends keyof TFilters,
>(
  store: {
    filters: TFilters;
    setFilters: (patch: Partial<TFilters>) => void;
  },
  key: K,
): WritableComputedRef<TFilters[K]> {
  return computed({
    get: () => store.filters[key],
    set: (value: TFilters[K]) =>
      store.setFilters({ [key]: value } as unknown as Partial<TFilters>),
  });
}

/** Debounced reaction when a store search filter changes. */
export function watchDebouncedStoreSearch(
  searchGetter: () => string,
  onChange: () => void,
) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  watch(searchGetter, () => {
    clearTimeout(timeout);
    timeout = setTimeout(onChange, SEARCH_DEBOUNCE_MS);
  });
}

/** Immediate reaction when non-search store filters change. */
export function watchStoreFilters(
  filterGetter: () => readonly unknown[],
  onChange: () => void,
) {
  watch(filterGetter, onChange);
}

/** Standard flat-store page change guard. */
export function changeFlatPage(
  store: { page: number; totalPages: number },
  page: number,
  fetchPage: (page: number) => void | Promise<void>,
) {
  if (page < 1 || page > store.totalPages) return;
  void fetchPage(page);
}

/** Standard meta-store page change guard. */
export function changeMetaPage(
  store: { meta: { page: number; totalPages: number } },
  page: number,
  fetchPage: (page: number) => void | Promise<void>,
) {
  if (page < 1 || page > store.meta.totalPages) return;
  void fetchPage(page);
}

/** Pagination range for stores using flat `page` / `limit` / `total`. */
export function useFlatPaginationRange(source: {
  page: number;
  limit: number;
  total: number;
}) {
  const showingStart = computed(() => {
    if (source.total === 0) return 0;
    return (source.page - 1) * source.limit + 1;
  });

  const showingEnd = computed(() =>
    Math.min(source.page * source.limit, source.total),
  );

  return { showingStart, showingEnd };
}

/** Pagination range for stores using nested `meta`. */
export function useMetaPaginationRange(meta: {
  page: number;
  limit: number;
  total: number;
}) {
  const showingStart = computed(() => {
    if (meta.total === 0) return 0;
    return (meta.page - 1) * meta.limit + 1;
  });

  const showingEnd = computed(() =>
    Math.min(meta.page * meta.limit, meta.total),
  );

  return { showingStart, showingEnd };
}
