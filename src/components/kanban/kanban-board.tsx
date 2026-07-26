'use client'

import { useState } from 'react'
import { DndContext, DragOverlay, closestCorners, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { KanbanColumn } from './kanban-column'
import { KanbanCard } from './kanban-card'
import { useUpdateArticle } from '@/hooks/use-articles'
import { isValidTransition } from '@/lib/validations/article'
import type { UpdateArticleInput } from '@/lib/validations/article'

const KANBAN_COLUMNS = [
  { id: 'idea', label: 'Ideia' },
  { id: 'planning', label: 'Planejando' },
  { id: 'researching', label: 'Pesquisando' },
  { id: 'writing', label: 'Escrevendo' },
  { id: 'reviewing', label: 'Revisando' },
  { id: 'ready', label: 'Pronto' },
  { id: 'published', label: 'Publicado' },
] as const

interface Article {
  id: string
  title: string
  status: string
  quality_score?: number | null
  scheduled_date?: string | null
  blog_id: string
}

interface KanbanBoardProps {
  articles: Article[]
}

export function KanbanBoard({ articles }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const updateArticle = useUpdateArticle()

  const activeArticle = articles.find((a) => a.id === activeId)

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const articleId = active.id as string
    const newStatus = over.id as string
    const article = articles.find((a) => a.id === articleId)

    if (!article || article.status === newStatus) return
    if (!isValidTransition(article.status, newStatus)) return

    updateArticle.mutate({ id: articleId, data: { status: newStatus as UpdateArticleInput['status'] } })
  }

  return (
    <DndContext
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((column) => {
          const columnArticles = articles.filter((a) => a.status === column.id)
          return (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.label}
              count={columnArticles.length}
            >
              {columnArticles.map((article) => (
                <KanbanCard key={article.id} article={article} />
              ))}
            </KanbanColumn>
          )
        })}
      </div>

      <DragOverlay>
        {activeArticle ? <KanbanCard article={activeArticle} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  )
}
