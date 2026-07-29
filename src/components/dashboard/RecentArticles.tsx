'use client'

import { FileText } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export interface RecentArticleItem {
  id: string
  title: string
  blogName: string
  date: string
  status: string
}

export interface RecentArticlesProps {
  articles: RecentArticleItem[]
}

const statusVariantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  published: 'default',
  ready: 'default',
  reviewing: 'secondary',
  writing: 'secondary',
  idea: 'outline',
  archived: 'destructive',
}

export function RecentArticles({ articles }: RecentArticlesProps) {
  if (articles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Artigos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhum artigo encontrado</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Artigos Recentes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {articles.map((article) => (
            <div
              key={article.id}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium leading-tight">{article.title}</p>
                  <p className="text-xs text-muted-foreground">{article.blogName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={statusVariantMap[article.status] ?? 'outline'}>
                  {article.status}
                </Badge>
                <span className="text-xs text-muted-foreground">{article.date}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
