// @vitest-environment node

/**
 * Property Test — Task 1.3
 * Property 14: State Machine Transition Validity
 *
 * For any pipeline state S and target T:
 * - If T is NOT in VALID_TRANSITIONS[S], the transition must throw PipelineTransitionError
 * - If T IS in VALID_TRANSITIONS[S], the transition must succeed and new state must be T
 *
 * Feature: audit-fixes-implementation, Property 14: State Machine Transition Validity
 * Validates: Requirements 27.1, 27.2, 27.4
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  PipelineStateMachine,
  PipelineTransitionError,
  VALID_TRANSITIONS,
  type PipelineState,
} from '@/lib/pipeline/state-machine'

const ALL_STATES: PipelineState[] = [
  'queued',
  'planning',
  'researching',
  'writing',
  'reviewing',
  'awaiting_approval',
  'completed',
  'revision',
  'failed',
  'cancelled',
  'rejected',
]

const stateArb = fc.constantFrom(...ALL_STATES)

describe('PipelineStateMachine — Property Tests', () => {
  it('Property 14: valid transitions succeed and update state', () => {
    fc.assert(
      fc.property(stateArb, stateArb, (from, to) => {
        const sm = new PipelineStateMachine(from)
        const validTargets = VALID_TRANSITIONS[from] ?? []

        if (validTargets.includes(to)) {
          const result = sm.transition(to)
          expect(result).toBe(to)
          expect(sm.state).toBe(to)
        }
      }),
      { numRuns: 200 }
    )
  })

  it('Property 14: invalid transitions throw PipelineTransitionError', () => {
    fc.assert(
      fc.property(stateArb, stateArb, (from, to) => {
        const sm = new PipelineStateMachine(from)
        const validTargets = VALID_TRANSITIONS[from] ?? []

        if (!validTargets.includes(to)) {
          expect(() => sm.transition(to)).toThrow(PipelineTransitionError)

          // Verify state did NOT change
          expect(sm.state).toBe(from)
        }
      }),
      { numRuns: 200 }
    )
  })

  it('Property 14: PipelineTransitionError contains correct metadata', () => {
    fc.assert(
      fc.property(stateArb, stateArb, (from, to) => {
        const validTargets = VALID_TRANSITIONS[from] ?? []

        if (!validTargets.includes(to)) {
          const sm = new PipelineStateMachine(from)
          try {
            sm.transition(to)
            // Should not reach here
            expect.fail('Expected PipelineTransitionError')
          } catch (err) {
            expect(err).toBeInstanceOf(PipelineTransitionError)
            const error = err as PipelineTransitionError
            expect(error.from).toBe(from)
            expect(error.to).toBe(to)
            expect(error.validTargets).toEqual(validTargets)
            expect(error.statusCode).toBe(409)
          }
        }
      }),
      { numRuns: 100 }
    )
  })

  it('getValidTransitions returns correct targets for each state', () => {
    for (const state of ALL_STATES) {
      const sm = new PipelineStateMachine(state)
      expect(sm.getValidTransitions()).toEqual(VALID_TRANSITIONS[state])
    }
  })

  it('terminal states have no valid transitions', () => {
    const terminalStates: PipelineState[] = ['completed', 'cancelled', 'rejected']
    for (const state of terminalStates) {
      const sm = new PipelineStateMachine(state)
      expect(sm.getValidTransitions()).toHaveLength(0)
    }
  })
})
