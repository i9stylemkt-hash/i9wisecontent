'use client'

import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useArticles } from '@/hooks/use-articles'
import { FileText, Search, Star, Calendar } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  idea: { label: 'Ideia', variant: 'secondary' },
  planning: { label: 'Planejando', variant: 'secondary' },
  researching: { label: 'Pesquisando', variant: 'outline' },
  writing: { label: 'Escrevendo', variant: 'outline' },
  reviewing: { label: 'Revisando', variant: 'default' },
  revision: { label: 'Revisão', variant: 'destructive' },
  ready: { label: 'Pronto', variant: 'default' },
  published: { label: 'Publicado', variant: 'default' },
  archived: { label: 'Arquivado', variant: 'secondary' },
}

export default function ArticlesPage() {
  const { data: articles, isLoading } = useArticles()
  const [search, setSearch] = useState('')

  const filteredArticles = (articles || []).filter((a: Record<string, unknown>) =>
    !search || (a.title as string).toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <PageHeader title="Artigos" description="Todos os artigos dos seus blogs" />

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar artigo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : filteredArticles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">Nenhum artigo ainda</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Artigos aparecerão aqui quando forem gerados ou criados manualmente.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredArticles.map((article: Record<string, unknown>) => {
            const statusInfo = STATUS_LABELS[(article.status as string) || 'idea']
            return (
              <Link key={article.id as string} href={`/articles/${article.id}`}>
                <Card className="transition-colors hover:bg-accent/30">
                  <CardContent className="flex items-center gap-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{article.title as string}</p>
                      <p className="text-xs text-muted-foreground">
                        {article.scheduled_date ? `Agendado: ${article.scheduled_date}` : 'Sem data'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {(article.quality_score as number) > 0 && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Star className="h-3 w-3" />
                          {String(article.quality_score)}
                        </span>
                      )}
                      <Badge variant={statusInfo?.variant || 'secondary'}>
                        {statusInfo?.label || article.status as string}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
