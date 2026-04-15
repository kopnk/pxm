export function buildPagination(query: any) {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.max(Number(query.limit) || 10, 1);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

export function buildTotalPages(total: number, limit: number) {
  return Math.ceil(total / limit);
}
