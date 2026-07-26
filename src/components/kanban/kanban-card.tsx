'use client'

import { useDraggable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import { Calendar, Star } from 'lucide-react'
import Link from 'next/link'

interface Article {
  id: string
  title: string
  status: string
  quality_score?: number | null
  scheduled_date?: string | null
}

interface KanbanCardProps {
  article: Article
  isDragging?: boolean
}

export function KanbanCard({ article, isDragging }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: article.id,
  })

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'group cursor-grab rounded-md border border-border bg-background p-3 shadow-xs transition-shadow hover:shadow-sm',
        isDragging && 'opacity-50 shadow-md rotate-2'
      )}
    >
      <Link href={`/articles/${article.id}`} className="block" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-medium text-foreground line-clamp-2">{article.title}</p>

        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          {article.quality_score && (
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3" />
              {article.quality_score}
            </span>
          )}
          {article.scheduled_date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {article.scheduled_date}
            </span>
          )}
        </div>
      </Link>
    </div>
  )
}
