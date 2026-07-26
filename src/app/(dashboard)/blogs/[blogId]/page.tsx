'use client'

import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { KanbanBoard } from '@/components/kanban/kanban-board'
import { useArticles } from '@/hooks/use-articles'
import { useBlog } from '@/hooks/use-blogs'
import { useCreateArticle } from '@/hooks/use-articles'
import { Plus, Settings, FileText } from 'lucide-react'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { useState } from 'react'
import { Input } from '@/components/ui/input'

export default function BlogDetailPage() {
  const params = useParams()
  const blogId = params.blogId as string
  const { data: blog, isLoading: blogLoading } = useBlog(blogId)
  const { data: articles, isLoading: articlesLoading } = useArticles(blogId)
  const createArticle = useCreateArticle()
  const [showNewArticle, setShowNewArticle] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  async function handleCreateArticle() {
    if (!newTitle.trim()) return
    await createArticle.mutateAsync({ blogId, title: newTitle, status: 'idea' })
    setNewTitle('')
    setShowNewArticle(false)
  }

  if (blogLoading) {
    return <div className="animate-pulse space-y-4"><div className="h-8 w-48 rounded bg-muted" /><div className="h-64 rounded bg-muted" /></div>
  }

  const blogName = (blog as { name?: string })?.name || 'Blog'

  return (
    <div className="space-y-6">
      <PageHeader title={blogName} description="Kanban de artigos">
        <Button variant="outline" size="sm" onClick={() => setShowNewArticle(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Novo Artigo
        </Button>
        <Link href={`/blogs/${blogId}/settings`} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          <Settings className="h-3.5 w-3.5" />
        </Link>
      </PageHeader>

      {/* Quick Create Article */}
      {showNewArticle && (
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <Input
              placeholder="Título do artigo..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateArticle()}
              autoFocus
            />
            <Button size="sm" onClick={handleCreateArticle} disabled={createArticle.isPending}>
              Criar
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowNewArticle(false)}>
              Cancelar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Kanban */}
      {articlesLoading ? (
        <div className="animate-pulse h-64 rounded-lg bg-muted" />
      ) : articles?.length ? (
        <KanbanBoard articles={articles} />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">Nenhum artigo neste blog</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Crie um artigo para começar a organizar seu conteúdo.
            </p>
            <Button className="mt-4" onClick={() => setShowNewArticle(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar primeiro artigo
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
