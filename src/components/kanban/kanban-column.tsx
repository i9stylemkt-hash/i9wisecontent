'use client'

import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'

interface KanbanColumnProps {
  id: string
  title: string
  count: number
  children: React.ReactNode
}

export function KanbanColumn({ id, title, count, children }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-64 flex-shrink-0 flex-col rounded-lg border border-border bg-card/50',
        isOver && 'border-primary/50 bg-primary/5'
      )}
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <h3 className="text-xs font-medium text-foreground">{title}</h3>
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
          {count}
        </span>
      </div>
      <div className="flex flex-col gap-2 p-2 min-h-[120px] overflow-y-auto max-h-[calc(100vh-280px)]">
        {children}
      </div>
    </div>
  )
}
