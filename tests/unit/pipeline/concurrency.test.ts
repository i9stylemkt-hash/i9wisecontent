// @vitest-environment node

/**
 * Property Test — Task 7.7
 * Property 13: Pipeline Concurrency Enforcement
 *
 * Para qualquer usuário com N pipeline requests onde N > 3,
 * no máximo 3 pipelines devem ter status "running" simultaneamente,
 * e os restantes devem ter status "queued" com queue_position crescente.
 *
 * Feature: audit-fixes-implementation, Property 13: Pipeline Concurrency Enforcement
 * Validates: Requirements 26.1, 26.2
 */

import { describe, it, expect, vi } from 'vitest'
import * as fc from 'fast-check'
import {
  checkConcurrency,
  dequeueNext,
  getNextQueuePosition,
  MAX_CONCURRENT_PIPELINES,
} from '@/lib/pipeline/concurrency'

function createMockSupabase(runningCount: number, queuedCount = 0) {
  const runningData = Array.from({ length: runningCount }, (_, i) => ({ id: `running-${i}` }))
  const queuedData = Array.from({ length: queuedCount }, (_, i) => ({
    id: `queued-${i}`,
    created_at: new Date(Date.now() + i * 1000).toISOString(),
  }))

  let callIndex = 0

  const mockQueryBuilder: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(() => {
      if (queuedData.length > 0) {
        return Promise.resolve({ data: queuedData[0], error: null })
      }
      return Promise.resolve({ data: null, error: { message: 'not found' } })
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  }

  // Override the final resolution (when chain ends without .single())
  // The mock needs to resolve differently based on the 'status' filter
  const originalEq = mockQueryBuilder.eq
  let statusFilter: string | null = null

  mockQueryBuilder.eq = vi.fn((...args: unknown[]) => {
    if (args[0] === 'status') {
      statusFilter = args[1] as string
    }

    // For terminal queries (without .single()), resolve with data
    const result = {
      ...mockQueryBuilder,
      then: (resolve: (val: unknown) => void) => {
        if (statusFilter === 'running') {
          resolve({ data: runningData, error: null })
        } else if (statusFilter === 'queued') {
          resolve({ data: queuedData, error: null })
        } else {
          resolve({ data: [], error: null })
        }
      },
    }
    // Make it thenable (Promise-like)
    Object.defineProperty(result, 'then', {
      value: (resolve: (val: unknown) => void) => {
        if (statusFilter === 'running') {
          resolve({ data: runningData, error: null })
        } else if (statusFilter === 'queued') {
          resolve({ data: queuedData, error: null })
        } else {
          resolve({ data: [], error: null })
        }
      },
      enumerable: false,
    })
    return result
  })

  // Make the base query thenable too
  Object.defineProperty(mockQueryBuilder.order('', {}), 'then', {
    value: undefined,
  })

  return {
    from: vi.fn(() => mockQueryBuilder),
    _mock: mockQueryBuilder,
  }
}

// Simpler mock for checkConcurrency specifically
function createSimpleCheckMock(runningCount: number) {
  return {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: Array.from({ length: runningCount }, (_, i) => ({ id: `r-${i}` })),
            error: null,
          }),
        }),
      }),
    })),
  }
}

function createSimpleQueueMock(queuedCount: number) {
  return {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: Array.from({ length: queuedCount }, (_, i) => ({ id: `q-${i}` })),
              error: null,
            }),
          }),
        }),
      }),
    })),
  }
}

describe('Pipeline Concurrency — Property Tests', () => {
  it('Property 13: MAX_CONCURRENT_PIPELINES é 3', () => {
    expect(MAX_CONCURRENT_PIPELINES).toBe(3)
  })

  it('Property 13: canRun é true quando running < MAX_CONCURRENT', () => {
    fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: MAX_CONCURRENT_PIPELINES - 1 }),
        async (runningCount) => {
          const mockSb = createSimpleCheckMock(runningCount)
          const result = await checkConcurrency('user-1', mockSb)
          expect(result.canRun).toBe(true)
          expect(result.currentRunning).toBe(runningCount)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 13: canRun é false quando running >= MAX_CONCURRENT', () => {
    fc.assert(
      fc.asyncProperty(
        fc.integer({ min: MAX_CONCURRENT_PIPELINES, max: 10 }),
        async (runningCount) => {
          // For canRun=false path, checkConcurrency also calls getNextQueuePosition
          // which makes another query. We need a more complex mock.
          const mockSb = {
            from: vi.fn(() => ({
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({
                      data: [], // queued pipelines for getNextQueuePosition
                      error: null,
                    }),
                  }),
                }),
              }),
            })),
          }
          // First call returns running pipelines
          let callIdx = 0
          mockSb.from = vi.fn(() => {
            callIdx++
            if (callIdx === 1) {
              // checkConcurrency: running pipelines
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({
                      data: Array.from({ length: runningCount }, (_, i) => ({ id: `r-${i}` })),
                      error: null,
                    }),
                  }),
                }),
              } as any
            }
            // getNextQueuePosition: queued pipelines
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({
                      data: [],
                      error: null,
                    }),
                  }),
                }),
              }),
            } as any
          })

          const result = await checkConcurrency('user-1', mockSb)
          expect(result.canRun).toBe(false)
          expect(result.currentRunning).toBe(runningCount)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 13: queuePosition é crescente (1-based count of queued)', () => {
    fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 20 }),
        async (queuedCount) => {
          const mockSb = createSimpleQueueMock(queuedCount)
          const position = await getNextQueuePosition('user-1', mockSb)
          // Position is queuedCount + 1 (next in line)
          expect(position).toBe(queuedCount + 1)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 13: dequeueNext retorna null quando capacity está cheia', async () => {
    const mockSb = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: Array.from({ length: MAX_CONCURRENT_PIPELINES }, (_, i) => ({ id: `r-${i}` })),
              error: null,
            }),
          }),
        }),
      })),
    }

    const result = await dequeueNext('user-1', mockSb)
    expect(result).toBeNull()
  })

  it('Property 13: dequeueNext retorna null quando fila está vazia e há capacidade', async () => {
    let callIdx = 0
    const mockSb = {
      from: vi.fn(() => {
        callIdx++
        if (callIdx === 1) {
          // running count = 0
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          } as any
        }
        // queued = empty
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: null, error: { message: 'none' } }),
                  }),
                }),
              }),
            }),
          }),
        } as any
      }),
    }

    const result = await dequeueNext('user-1', mockSb)
    expect(result).toBeNull()
  })
})
