'use client'

import { Badge } from '@/components/ui/badge'

export type PipelineStatusType =
  | 'queued'
  | 'running'
  | 'awaiting_approval'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface PipelineStatusProps {
  status: PipelineStatusType
  showLabel?: boolean
}

const statusConfig: Record<PipelineStatusType, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  queued: { label: 'Na fila', variant: 'outline' },
  running: { label: 'Executando', variant: 'default' },
  awaiting_approval: { label: 'Aguardando aprovação', variant: 'secondary' },
  completed: { label: 'Concluído', variant: 'default' },
  failed: { label: 'Falhou', variant: 'destructive' },
  cancelled: { label: 'Cancelado', variant: 'secondary' },
}

export function PipelineStatus({ status, showLabel = true }: PipelineStatusProps) {
  const config = statusConfig[status] ?? statusConfig.queued

  return (
    <Badge variant={config.variant}>
      <span
        className={`mr-1 inline-block h-2 w-2 rounded-full ${
          status === 'running'
            ? 'animate-pulse bg-green-500'
            : status === 'failed'
              ? 'bg-red-500'
              : status === 'completed'
                ? 'bg-green-500'
                : 'bg-muted-foreground'
        }`}
      />
      {showLabel && config.label}
    </Badge>
  )
}
