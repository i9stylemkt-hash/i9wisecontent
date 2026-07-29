'use client'

import { cn } from '@/lib/utils'

const PIPELINE_STAGES = [
  { key: 'idea', label: 'Ideia' },
  { key: 'planning', label: 'Planejamento' },
  { key: 'researching', label: 'Pesquisa' },
  { key: 'writing', label: 'Escrita' },
  { key: 'reviewing', label: 'Revisão' },
  { key: 'ready', label: 'Pronto' },
] as const

type StageStatus = 'completed' | 'active' | 'pending'

interface PipelineProgressBarProps {
  currentStatus: string
  isProcessing?: boolean
}

export function PipelineProgressBar({ currentStatus, isProcessing }: PipelineProgressBarProps) {
  const stages = PIPELINE_STAGES.map((stage) => ({
    ...stage,
    status: getStageStatus(stage.key, currentStatus),
  }))

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-3">
      {stages.map((stage, index) => (
        <div key={stage.key} className="flex items-center gap-1">
          {/* Stage dot + label */}
          <div className="flex flex-col items-center gap-0.5">
            <div
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium transition-all',
                stage.status === 'completed' && 'bg-green-600 text-white',
                stage.status === 'active' && 'bg-primary text-primary-foreground',
                stage.status === 'active' && isProcessing && 'animate-pulse',
                stage.status === 'pending' && 'bg-muted text-muted-foreground'
              )}
            >
              {stage.status === 'completed' ? '✓' : index + 1}
            </div>
            <span
              className={cn(
                'text-[9px] leading-tight whitespace-nowrap',
                stage.status === 'completed' && 'text-green-500',
                stage.status === 'active' && 'text-primary font-medium',
                stage.status === 'pending' && 'text-muted-foreground'
              )}
            >
              {stage.label}
            </span>
          </div>
          {/* Connector line */}
          {index < stages.length - 1 && (
            <div
              className={cn(
                'h-px w-4 sm:w-6 lg:w-8 transition-colors',
                stage.status === 'completed' ? 'bg-green-600' : 'bg-border'
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function getStageStatus(stageKey: string, currentStatus: string): StageStatus {
  const stageOrder = ['idea', 'planning', 'researching', 'writing', 'reviewing', 'ready']
  const currentIndex = stageOrder.indexOf(normalizeStatus(currentStatus))
  const stageIndex = stageOrder.indexOf(stageKey)

  if (stageIndex < 0 || currentIndex < 0) return 'pending'

  if (stageIndex < currentIndex) return 'completed'
  if (stageIndex === currentIndex) return 'active'
  return 'pending'
}

function normalizeStatus(status: string): string {
  // "revision" maps to after "reviewing" (special case)
  if (status === 'revision') return 'reviewing'
  if (status === 'published' || status === 'archived') return 'ready'
  return status
}
