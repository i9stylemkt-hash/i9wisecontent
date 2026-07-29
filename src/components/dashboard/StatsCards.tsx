'use client'

import { BookOpen, FileText, Workflow, DollarSign } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export interface StatsData {
  totalBlogs: number
  totalArticles: number
  totalPipelines: number
  totalCost: number
}

export interface StatsCardsProps {
  stats: StatsData
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: 'Total de Blogs',
      value: stats.totalBlogs,
      icon: BookOpen,
      format: (v: number) => v.toString(),
    },
    {
      title: 'Artigos',
      value: stats.totalArticles,
      icon: FileText,
      format: (v: number) => v.toString(),
    },
    {
      title: 'Pipelines',
      value: stats.totalPipelines,
      icon: Workflow,
      format: (v: number) => v.toString(),
    },
    {
      title: 'Custo Total',
      value: stats.totalCost,
      icon: DollarSign,
      format: (v: number) => `R$ ${v.toFixed(2)}`,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} size="sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{card.format(card.value)}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
