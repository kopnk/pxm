export const DEFAULT_PAGE_LIMIT = 100;
export const SEARCH_DEBOUNCE_MS = 500;

type PaginationInput = {
  page?: number | string | null | undefined;
  limit?: number | string | null | undefined;
};

export function buildPagination(input: PaginationInput) {
  const page = Math.max(Number(input.page) || 1, 1);
  const limit = Math.max(Number(input.limit) || DEFAULT_PAGE_LIMIT, 1);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

export function buildTotalPages(total: number, limit: number) {
  return Math.ceil(total / limit);
}
