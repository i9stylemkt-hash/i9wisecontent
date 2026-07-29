// @vitest-environment node
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  PipelineStateMachine,
  PipelineTransitionError,
  VALID_TRANSITIONS,
} from '@/lib/pipeline/state-machine'
import type { PipelineState } from '@/lib/pipeline/state-machine'

const ALL_STATES = Object.keys(VALID_TRANSITIONS) as PipelineState[]

describe('Feature: audit-corrections-plan, Property 6: State machine valid transitions', () => {
  it('performing a valid transition from any state always succeeds', () => {
    // Only test states that have valid transitions
    const statesWithTransitions = ALL_STATES.filter(
      (s) => VALID_TRANSITIONS[s].length > 0
    )

    fc.assert(
      fc.property(
        fc.constantFrom(...statesWithTransitions),
        (initialState) => {
          const validTargets = VALID_TRANSITIONS[initialState]
          if (validTargets.length === 0) return true // skip terminal states

          // Pick a random valid target
          const targetIndex = Math.floor(Math.random() * validTargets.length)
          const target = validTargets[targetIndex]!

          const machine = new PipelineStateMachine(initialState)
          const result = machine.transition(target)
          expect(result).toBe(target)
          expect(machine.state).toBe(target)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('performing a valid transition always succeeds (exhaustive with fc)', () => {
    // Generate pairs of (state, validTarget)
    const validPairs: [PipelineState, PipelineState][] = []
    for (const state of ALL_STATES) {
      for (const target of VALID_TRANSITIONS[state]) {
        validPairs.push([state, target])
      }
    }

    if (validPairs.length === 0) return

    fc.assert(
      fc.property(
        fc.constantFrom(...validPairs),
        ([initialState, target]) => {
          const machine = new PipelineStateMachine(initialState)
          const result = machine.transition(target)
          expect(result).toBe(target)
          expect(machine.state).toBe(target)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('performing an invalid transition always throws PipelineTransitionError', () => {
    // Generate pairs of (state, invalidTarget)
    const invalidPairs: [PipelineState, PipelineState][] = []
    for (const state of ALL_STATES) {
      const validTargets = VALID_TRANSITIONS[state]
      const invalidTargets = ALL_STATES.filter(
        (s) => !validTargets.includes(s) && s !== state
      )
      for (const target of invalidTargets) {
        invalidPairs.push([state, target])
      }
    }

    if (invalidPairs.length === 0) return

    fc.assert(
      fc.property(
        fc.constantFrom(...invalidPairs),
        ([initialState, invalidTarget]) => {
          const machine = new PipelineStateMachine(initialState)
          expect(() => machine.transition(invalidTarget)).toThrow(PipelineTransitionError)
        }
      ),
      { numRuns: 100 }
    )
  })
})
