/**
 * Pagination Utility — cursor-based e offset-based pagination.
 * Fornece parsing de parâmetros e interface genérica PaginatedResult.
 */

export interface PaginationParams {
  page: number
  pageSize: number
  cursor?: { createdAt: string; id: string }
}

export interface PaginatedResult<T> {
  data: T[]
  meta: {
    total: number
    page: number
    pageSize: number
    hasMore: boolean
    nextCursor?: { createdAt: string; id: string }
  }
}

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

/**
 * Parse parâmetros de paginação de URLSearchParams.
 * Aplica defaults e limites (max 100 por página).
 */
export function parsePaginationParams(searchParams: URLSearchParams): PaginationParams {
  const rawPage = searchParams.get('page')
  const rawPageSize = searchParams.get('pageSize') ?? searchParams.get('page_size')
  const cursorCreatedAt = searchParams.get('cursor_created_at')
  const cursorId = searchParams.get('cursor_id')

  const page = Math.max(1, parseInt(rawPage ?? '', 10) || DEFAULT_PAGE)
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(rawPageSize ?? '', 10) || DEFAULT_PAGE_SIZE)
  )

  const cursor =
    cursorCreatedAt && cursorId ? { createdAt: cursorCreatedAt, id: cursorId } : undefined

  return { page, pageSize, cursor }
}

/**
 * Cria um PaginatedResult a partir de dados e total.
 */
export function createPaginatedResult<T extends { created_at?: string; id?: string }>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResult<T> {
  const hasMore = params.page * params.pageSize < total

  // Cursor para próxima página (baseado no último item)
  const lastItem = data[data.length - 1]
  const nextCursor =
    hasMore && lastItem?.created_at && lastItem?.id
      ? { createdAt: lastItem.created_at, id: lastItem.id }
      : undefined

  return {
    data,
    meta: {
      total,
      page: params.page,
      pageSize: params.pageSize,
      hasMore,
      nextCursor,
    },
  }
}

/**
 * Calcula offset para paginação baseada em página.
 */
export function getOffset(params: PaginationParams): number {
  return (params.page - 1) * params.pageSize
}
