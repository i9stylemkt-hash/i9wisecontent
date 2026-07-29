'use client'

import { Button } from '@/components/ui/button'
import { ArrowRight, Loader2 } from 'lucide-react'
import { STAGE_LABELS } from '@/lib/pipeline/constants'

interface SaveAndAdvanceButtonProps {
  currentStatus: string
  isAdvancing: boolean
  isProcessing: boolean
  onAdvance: () => void
  disabled?: boolean
}

const ADVANCEABLE_STATUSES = ['idea', 'planning', 'researching', 'writing']

export function SaveAndAdvanceButton({
  currentStatus,
  isAdvancing,
  isProcessing,
  onAdvance,
  disabled,
}: SaveAndAdvanceButtonProps) {
  // Only show for statuses that can advance
  if (!ADVANCEABLE_STATUSES.includes(currentStatus)) {
    return null
  }

  const label = STAGE_LABELS[currentStatus] || 'Salvar & Avançar'
  const isLoading = isAdvancing || isProcessing

  return (
    <Button
      onClick={onAdvance}
      disabled={isLoading || disabled}
      className="gap-2"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {isProcessing ? 'Processando...' : 'Salvando...'}
        </>
      ) : (
        <>
          {label}
          <ArrowRight className="h-3.5 w-3.5" />
        </>
      )}
    </Button>
  )
}
