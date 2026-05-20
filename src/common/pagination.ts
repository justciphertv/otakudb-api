import { AppError } from "./errors.js";

export const MAX_PER_PAGE = 50;

export type PageArgs = {
  page?: number | null;
  perPage?: number | null;
};

export function normalizePage(args: PageArgs) {
  const page = Math.max(1, args.page ?? 1);
  const perPage = args.perPage ?? 20;
  if (perPage > MAX_PER_PAGE) {
    throw new AppError("perPage cannot exceed 50", "GRAPHQL_VALIDATION_FAILED", 400);
  }
  return {
    page,
    perPage,
    skip: (page - 1) * perPage,
    take: perPage
  };
}

export function pageInfo(total: number, page: number, perPage: number) {
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  return {
    currentPage: page,
    perPage,
    total,
    lastPage,
    hasNextPage: page < lastPage
  };
}
