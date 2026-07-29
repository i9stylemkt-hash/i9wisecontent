// @vitest-environment node

/**
 * Property Test — Task 5.6
 * Property 6: Pagination Correctness
 *
 * Para qualquer dataset de tamanho S e parâmetros (page, pageSize > 0),
 * os resultados devem ter no máximo pageSize itens, metadata.total == S,
 * e hasMore == true sse (page * pageSize) < S.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { parsePaginationParams, createPaginatedResult } from '@/lib/utils/pagination'

describe('Pagination — Property Tests', () => {
  describe('parsePaginationParams', () => {
    it('Property 6: page é sempre >= 1', () => {
      fc.assert(
        fc.property(fc.integer(), (pageVal) => {
          const params = new URLSearchParams({ page: String(pageVal) })
          const result = parsePaginationParams(params)
          expect(result.page).toBeGreaterThanOrEqual(1)
        }),
        { numRuns: 100 }
      )
    })

    it('Property 6: pageSize é sempre entre 1 e 100', () => {
      fc.assert(
        fc.property(fc.integer(), (pageSizeVal) => {
          const params = new URLSearchParams({ pageSize: String(pageSizeVal) })
          const result = parsePaginationParams(params)
          expect(result.pageSize).toBeGreaterThanOrEqual(1)
          expect(result.pageSize).toBeLessThanOrEqual(100)
        }),
        { numRuns: 100 }
      )
    })

    it('Property 6: valores inválidos resultam em defaults (page=1, pageSize=20)', () => {
      fc.assert(
        fc.property(
          fc.string().filter((s) => isNaN(parseInt(s, 10))),
          fc.string().filter((s) => isNaN(parseInt(s, 10))),
          (invalidPage, invalidPageSize) => {
            const params = new URLSearchParams({
              page: invalidPage,
              pageSize: invalidPageSize,
            })
            const result = parsePaginationParams(params)
            expect(result.page).toBe(1)
            expect(result.pageSize).toBe(20)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Property 6: aceita page_size como alias de pageSize', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          (size) => {
            const params = new URLSearchParams({ page_size: String(size) })
            const result = parsePaginationParams(params)
            expect(result.pageSize).toBe(size)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('createPaginatedResult', () => {
    it('Property 6: resultado tem no máximo pageSize itens', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 200 }),  // total size S
          fc.integer({ min: 1, max: 100 }),  // pageSize
          fc.integer({ min: 1, max: 10 }),   // page
          (totalSize, pageSize, page) => {
            // Simula dados para a página atual
            const itemsOnPage = Math.min(pageSize, Math.max(0, totalSize - (page - 1) * pageSize))
            const data = Array.from({ length: itemsOnPage }, (_, i) => ({
              id: `item-${i}`,
              created_at: new Date().toISOString(),
            }))

            const result = createPaginatedResult(data, totalSize, { page, pageSize })
            expect(result.data.length).toBeLessThanOrEqual(pageSize)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Property 6: metadata.total == S (tamanho real do dataset)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 500 }),  // total size S
          fc.integer({ min: 1, max: 50 }),   // pageSize
          fc.integer({ min: 1, max: 10 }),   // page
          (totalSize, pageSize, page) => {
            const data = Array.from({ length: Math.min(pageSize, totalSize) }, (_, i) => ({
              id: `item-${i}`,
              created_at: new Date().toISOString(),
            }))

            const result = createPaginatedResult(data, totalSize, { page, pageSize })
            expect(result.meta.total).toBe(totalSize)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Property 6: hasMore == true sse (page * pageSize) < total', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 500 }),  // total
          fc.integer({ min: 1, max: 50 }),   // pageSize
          fc.integer({ min: 1, max: 20 }),   // page
          (total, pageSize, page) => {
            const itemsOnPage = Math.min(pageSize, Math.max(0, total - (page - 1) * pageSize))
            const data = Array.from({ length: itemsOnPage }, (_, i) => ({
              id: `item-${i}`,
              created_at: new Date().toISOString(),
            }))

            const result = createPaginatedResult(data, total, { page, pageSize })

            const expectedHasMore = page * pageSize < total
            expect(result.meta.hasMore).toBe(expectedHasMore)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Property 6: meta.page e meta.pageSize refletem os params de entrada', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 50 }),  // pageSize
          fc.integer({ min: 1, max: 20 }),  // page
          (pageSize, page) => {
            const data = [{ id: '1', created_at: new Date().toISOString() }]
            const result = createPaginatedResult(data, 100, { page, pageSize })
            expect(result.meta.page).toBe(page)
            expect(result.meta.pageSize).toBe(pageSize)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Property 6: nextCursor existe somente quando hasMore e último item tem id/created_at', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),  // total (maior que pageSize para ter hasMore)
          fc.integer({ min: 1, max: 10 }),   // pageSize
          (total, pageSize) => {
            const page = 1
            const adjustedTotal = Math.max(total, pageSize + 1) // garante hasMore
            const data = Array.from({ length: pageSize }, (_, i) => ({
              id: `item-${i}`,
              created_at: new Date().toISOString(),
            }))

            const result = createPaginatedResult(data, adjustedTotal, { page, pageSize })

            if (result.meta.hasMore && data.length > 0) {
              expect(result.meta.nextCursor).toBeDefined()
              expect(result.meta.nextCursor?.id).toBe(data[data.length - 1].id)
              expect(result.meta.nextCursor?.createdAt).toBe(data[data.length - 1].created_at)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
