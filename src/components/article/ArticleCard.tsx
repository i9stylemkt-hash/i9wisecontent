'use client'

import { FileText, Star } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export interface ArticleCardProps {
  id: string
  title: string
  summary?: string | null
  status: string
  qualityScore?: number | null
  onClick?: (id: string) => void
}

const statusVariantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  published: 'default',
  ready: 'default',
  reviewing: 'secondary',
  writing: 'secondary',
  researching: 'secondary',
  planning: 'outline',
  idea: 'outline',
  revision: 'secondary',
  archived: 'destructive',
}

export function ArticleCard({ id, title, summary, status, qualityScore, onClick }: ArticleCardProps) {
  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => onClick?.(id)}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-2">{title}</CardTitle>
          <Badge variant={statusVariantMap[status] ?? 'outline'}>{status}</Badge>
        </div>
        {summary && (
          <CardDescription className="line-clamp-2">{summary}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" />
            <span className="capitalize">{status}</span>
          </div>
          {qualityScore != null && (
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5" />
              <span>{qualityScore}/10</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
