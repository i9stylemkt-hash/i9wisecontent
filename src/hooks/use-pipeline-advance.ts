'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { AdvanceResponse } from '@/lib/pipeline/constants'

interface GenerationMetadataForPolling {
  planner?: { completedAt?: string }
  researcher?: { completedAt?: string }
  writer?: { completedAt?: string }
  reviewer?: { completedAt?: string }
  _meta?: {
    pipelineError?: string
    failedStage?: string
  }
}

interface UsePipelineAdvanceOptions {
  articleId: string
  onSuccess?: (result: AdvanceResponse) => void
  onError?: (error: Error) => void
}

interface UsePipelineAdvanceReturn {
  advance: (data: { title: string; contentMarkdown: string; metaDescription?: string }) => void
  isAdvancing: boolean
  isProcessing: boolean
  currentStage: string | null
  error: Error | null
  reset: () => void
}

const POLL_INTERVAL = 2000
const TIMEOUT_MS = 120_000

export function usePipelineAdvance(options: UsePipelineAdvanceOptions): UsePipelineAdvanceReturn {
  const { articleId, onSuccess, onError } = options
  const queryClient = useQueryClient()

  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStage, setCurrentStage] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const targetStageRef = useRef<string | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const startPolling = useCallback((targetStage: string, advanceResult: AdvanceResponse) => {
    setIsProcessing(true)
    setCurrentStage(targetStage)
    targetStageRef.current = targetStage

    // Set timeout
    timeoutRef.current = setTimeout(() => {
      stopPolling()
      setIsProcessing(false)
      setError(new Error(`O agente "${targetStage}" excedeu o tempo limite (120s). Tente novamente.`))
    }, TIMEOUT_MS)

    // Start polling
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/articles/${articleId}`)
        if (!res.ok) return

        const article = await res.json()
        const metadata = (article.generation_metadata || {}) as GenerationMetadataForPolling
        const agentKey = getAgentKey(targetStage) as keyof GenerationMetadataForPolling

        // Check if agent completed (has completedAt)
        const stageResult = metadata[agentKey] as { completedAt?: string } | undefined
        if (stageResult?.completedAt) {
          stopPolling()
          setIsProcessing(false)
          setCurrentStage(null)
          setError(null)

          // Invalidate queries to refresh UI
          queryClient.invalidateQueries({ queryKey: ['articles'] })
          queryClient.invalidateQueries({ queryKey: ['articles', 'detail', articleId] })

          onSuccess?.(advanceResult)
          return
        }

        // Check if error occurred
        if (metadata._meta?.pipelineError) {
          stopPolling()
          setIsProcessing(false)
          const err = new Error(metadata._meta.pipelineError)
          setError(err)
          onError?.(err)
          return
        }
      } catch {
        // Network error during polling — continue trying
      }
    }, POLL_INTERVAL)
  }, [articleId, queryClient, onSuccess, onError, stopPolling])

  const advanceMutation = useMutation({
    mutationFn: async (data: { title: string; contentMarkdown: string; metaDescription?: string }) => {
      const res = await fetch(`/api/articles/${articleId}/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const errorBody = await res.json()
        throw new Error(errorBody.error || 'Erro ao avançar artigo')
      }

      return res.json() as Promise<AdvanceResponse>
    },
    onSuccess: (result) => {
      setError(null)
      // Start polling for agent completion
      startPolling(result.targetStage, result)

      // Invalidate to show new status immediately
      queryClient.invalidateQueries({ queryKey: ['articles'] })
      queryClient.invalidateQueries({ queryKey: ['articles', 'detail', articleId] })
    },
    onError: (err: Error) => {
      setError(err)
      setIsProcessing(false)
      onError?.(err)
    },
  })

  const advance = useCallback(
    (data: { title: string; contentMarkdown: string; metaDescription?: string }) => {
      setError(null)
      advanceMutation.mutate(data)
    },
    [advanceMutation]
  )

  const reset = useCallback(() => {
    stopPolling()
    setIsProcessing(false)
    setCurrentStage(null)
    setError(null)
  }, [stopPolling])

  return {
    advance,
    isAdvancing: advanceMutation.isPending,
    isProcessing,
    currentStage,
    error,
    reset,
  }
}

function getAgentKey(targetStage: string): string {
  switch (targetStage) {
    case 'planning': return 'planner'
    case 'researching': return 'researcher'
    case 'writing': return 'writer'
    case 'reviewing': return 'reviewer'
    default: return targetStage
  }
}
