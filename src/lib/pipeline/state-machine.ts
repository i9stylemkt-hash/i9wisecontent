/**
 * Pipeline State Machine — formal state transitions for the content pipeline.
 * Validates all transitions before applying them.
 */

export type PipelineState =
  | 'queued'
  | 'planning'
  | 'researching'
  | 'writing'
  | 'reviewing'
  | 'awaiting_approval'
  | 'completed'
  | 'revision'
  | 'failed'
  | 'cancelled'
  | 'rejected'

/** Static map of valid state transitions */
export const VALID_TRANSITIONS: Record<PipelineState, PipelineState[]> = {
  queued: ['planning', 'cancelled'],
  planning: ['researching', 'failed', 'awaiting_approval'],
  researching: ['writing', 'failed', 'awaiting_approval'],
  writing: ['reviewing', 'failed', 'awaiting_approval'],
  reviewing: ['completed', 'revision', 'awaiting_approval', 'failed'],
  awaiting_approval: ['planning', 'researching', 'writing', 'reviewing', 'rejected', 'cancelled'],
  revision: ['writing', 'cancelled'],
  completed: [],
  failed: ['queued'], // allow retry from failed
  cancelled: [],
  rejected: [],
}

/**
 * Error thrown when an invalid state transition is attempted.
 * Kept here to co-locate with state machine logic.
 * Also re-exported from @/lib/utils/errors for the unified error hierarchy.
 */
export class PipelineTransitionError extends Error {
  public readonly statusCode = 409
  public readonly code = 'PIPELINE_TRANSITION_ERROR'

  constructor(
    public readonly from: PipelineState,
    public readonly to: PipelineState,
    public readonly validTargets: PipelineState[]
  ) {
    super(`Invalid transition: ${from} → ${to}. Valid: [${validTargets.join(', ')}]`)
    this.name = 'PipelineTransitionError'
  }
}

/**
 * Manages pipeline state transitions with validation.
 * Ensures only valid transitions are applied per the VALID_TRANSITIONS map.
 */
export class PipelineStateMachine {
  private currentState: PipelineState

  constructor(initialState: PipelineState) {
    this.currentState = initialState
  }

  /** Current state of the pipeline */
  get state(): PipelineState {
    return this.currentState
  }

  /** Returns valid next states from the current state */
  getValidTransitions(): PipelineState[] {
    return VALID_TRANSITIONS[this.currentState] ?? []
  }

  /**
   * Validates and applies a state transition.
   * @throws PipelineTransitionError if the transition is invalid
   */
  transition(targetState: PipelineState): PipelineState {
    const valid = this.getValidTransitions()
    if (!valid.includes(targetState)) {
      throw new PipelineTransitionError(this.currentState, targetState, valid)
    }
    this.currentState = targetState
    return this.currentState
  }
}
