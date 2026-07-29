// @vitest-environment node
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { parsePaginationParams, createPaginatedResult } from '@/lib/utils/pagination'

describe('Feature: audit-corrections-plan, Property 3: Pagination limits results', () => {
  it('parsePaginationParams always returns pageSize <= 100', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 200 }),
        (page, pageSize) => {
          const params = new URLSearchParams({
            page: page.toString(),
            pageSize: pageSize.toString(),
          })
          const result = parsePaginationParams(params)
          expect(result.pageSize).toBeLessThanOrEqual(100)
          expect(result.pageSize).toBeGreaterThanOrEqual(1)
          expect(result.page).toBeGreaterThanOrEqual(1)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('parsePaginationParams clamps page to >= 1', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100, max: 100 }),
        (page) => {
          const params = new URLSearchParams({ page: page.toString() })
          const result = parsePaginationParams(params)
          expect(result.page).toBeGreaterThanOrEqual(1)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('createPaginatedResult returns <= min(pageSize, N) items and correct hasMore', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 500 }),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 50 }),
        (totalItems, pageSize, page) => {
          // Simulate data: items that would be on this page
          const offset = (page - 1) * pageSize
          const itemsOnPage = Math.max(0, Math.min(pageSize, totalItems - offset))
          const data = Array.from({ length: itemsOnPage }, (_, i) => ({
            id: `item-${offset + i}`,
            created_at: new Date().toISOString(),
          }))

          const params = { page, pageSize }
          const result = createPaginatedResult(data, totalItems, params)

          // Result items should not exceed pageSize
          expect(result.data.length).toBeLessThanOrEqual(pageSize)
          // hasMore is true when there are more pages
          const expectedHasMore = page * pageSize < totalItems
          expect(result.meta.hasMore).toBe(expectedHasMore)
        }
      ),
      { numRuns: 100 }
    )
  })
})
