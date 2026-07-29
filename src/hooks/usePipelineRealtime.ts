'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface PipelineEvent {
  id: string
  pipeline_run_id: string
  status: string
  current_stage: string | null
  timestamp: string
  payload?: Record<string, unknown>
}

interface UsePipelineRealtimeReturn {
  events: PipelineEvent[]
  latestEvent: PipelineEvent | null
  isConnected: boolean
}

/**
 * Hook React que subscribe ao canal Supabase Realtime filtrando por pipeline_runs.
 * Atualiza estado quando status ou current_stage mudam.
 * Emite evento de conclusão (sucesso ou falha).
 *
 * @param userId - ID do usuário para filtrar eventos
 */
export function usePipelineRealtime(userId: string): UsePipelineRealtimeReturn {
  const [events, setEvents] = useState<PipelineEvent[]>([])
  const [latestEvent, setLatestEvent] = useState<PipelineEvent | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)

  const handlePayload = useCallback((payload: Record<string, unknown>) => {
    const newRecord = payload.new as Record<string, unknown> | undefined
    if (!newRecord) return

    const event: PipelineEvent = {
      id: (newRecord.id as string) ?? crypto.randomUUID(),
      pipeline_run_id: newRecord.pipeline_run_id as string ?? newRecord.id as string,
      status: newRecord.status as string,
      current_stage: (newRecord.current_stage as string) ?? null,
      timestamp: (newRecord.updated_at as string) ?? new Date().toISOString(),
      payload: newRecord.metadata as Record<string, unknown> | undefined,
    }

    setEvents((prev) => [...prev, event])
    setLatestEvent(event)
  }, [])

  useEffect(() => {
    if (!userId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`pipeline-runs:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pipeline_runs',
          filter: `user_id=eq.${userId}`,
        },
        handlePayload
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pipeline_runs',
          filter: `user_id=eq.${userId}`,
        },
        handlePayload
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      setIsConnected(false)
    }
  }, [userId, handlePayload])

  return { events, latestEvent, isConnected }
}
