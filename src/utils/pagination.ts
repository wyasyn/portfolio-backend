export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginationResult {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const getPaginationParams = (page?: string, limit?: string): PaginationOptions => {
  const pageNum = Math.max(1, parseInt(page || '1', 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit || '10', 10)));
  return { page: pageNum, limit: limitNum };
};

export const calculatePagination = (
  total: number,
  page: number,
  limit: number
): PaginationResult => {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
};
