/**
 * Pipeline Concurrency Control — limits simultaneous pipeline executions per user.
 *
 * - MAX_CONCURRENT_PIPELINES = 3 per user
 * - Pipelines beyond limit are queued
 * - dequeueNext picks the oldest queued pipeline when a slot opens
 *
 * Nota: pipeline_runs NÃO tem coluna user_id diretamente.
 * Ownership é via join: pipeline_runs.blog_id → blogs.user_id.
 * As queries usam `blogs!inner(user_id)` para filtrar por usuário.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export interface ConcurrencyCheckResult {
  canRun: boolean
  currentRunning: number
  queuePosition?: number
}

export const MAX_CONCURRENT_PIPELINES = 3

/**
 * Check if a user can start a new pipeline execution.
 * Queries pipeline_runs via join com blogs para filtrar por userId.
 */
export async function checkConcurrency(
  userId: string,
  supabase: SupabaseClient
): Promise<ConcurrencyCheckResult> {
  const { data: runningPipelines, error } = await supabase
    .from('pipeline_runs')
    .select('id, blogs!inner(user_id)')
    .eq('blogs.user_id', userId)
    .eq('status', 'running')

  if (error) {
    throw new Error(`Failed to check concurrency: ${error.message}`)
  }

  const currentRunning = runningPipelines?.length ?? 0
  const canRun = currentRunning < MAX_CONCURRENT_PIPELINES

  if (canRun) {
    return { canRun: true, currentRunning }
  }

  // Get queue position for the user
  const queuePosition = await getNextQueuePosition(userId, supabase)

  return {
    canRun: false,
    currentRunning,
    queuePosition,
  }
}

/**
 * Get the next queue position for a user.
 * Counts how many pipelines with status 'queued' exist for this user.
 */
export async function getNextQueuePosition(
  userId: string,
  supabase: SupabaseClient
): Promise<number> {
  const { data: queuedPipelines, error } = await supabase
    .from('pipeline_runs')
    .select('id, blogs!inner(user_id)')
    .eq('blogs.user_id', userId)
    .eq('status', 'queued')
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to get queue position: ${error.message}`)
  }

  return (queuedPipelines?.length ?? 0) + 1
}

/**
 * Dequeue the next pipeline in line for a user.
 * Finds the oldest 'queued' pipeline and updates its status to 'running'.
 * Returns the pipeline run ID if found, or null if queue is empty.
 */
export async function dequeueNext(
  userId: string,
  supabase: SupabaseClient
): Promise<string | null> {
  // First check if user has capacity
  const { data: runningPipelines, error: runningError } = await supabase
    .from('pipeline_runs')
    .select('id, blogs!inner(user_id)')
    .eq('blogs.user_id', userId)
    .eq('status', 'running')

  if (runningError) {
    throw new Error(`Failed to check running pipelines: ${runningError.message}`)
  }

  const currentRunning = runningPipelines?.length ?? 0
  if (currentRunning >= MAX_CONCURRENT_PIPELINES) {
    return null
  }

  // Get next queued pipeline (oldest first)
  const { data: nextQueued, error: queueError } = await supabase
    .from('pipeline_runs')
    .select('id, blogs!inner(user_id)')
    .eq('blogs.user_id', userId)
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (queueError || !nextQueued) {
    return null
  }

  // Update status to 'running'
  const { error: updateError } = await supabase
    .from('pipeline_runs')
    .update({ status: 'running', started_at: new Date().toISOString() })
    .eq('id', nextQueued.id)

  if (updateError) {
    throw new Error(`Failed to dequeue pipeline: ${updateError.message}`)
  }

  return nextQueued.id
}
