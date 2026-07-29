'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Plus, Lightbulb, Search, ArrowRight } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-500/10 text-red-500',
  high: 'bg-orange-500/10 text-orange-500',
  medium: 'bg-yellow-500/10 text-yellow-500',
  low: 'bg-green-500/10 text-green-500',
}

export default function IdeasPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newBlogId, setNewBlogId] = useState('')

  const { data: ideas, isLoading } = useQuery({
    queryKey: ['ideas'],
    queryFn: async () => {
      const res = await fetch('/api/ideas')
      if (!res.ok) throw new Error('Erro')
      const json = await res.json()
      // API returns paginated result { data: [], meta: {} } — extract the array
      return Array.isArray(json) ? json : (json.data ?? [])
    },
  })

  const { data: blogs } = useQuery({
    queryKey: ['blogs'],
    queryFn: async () => {
      const res = await fetch('/api/blogs')
      if (!res.ok) throw new Error('Erro')
      return res.json()
    },
  })

  const createIdea = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blogId: newBlogId, title: newTitle }),
      })
      if (!res.ok) throw new Error('Erro ao criar')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] })
      setNewTitle('')
      setShowCreate(false)
    },
  })

  const convertIdea = useMutation({
    mutationFn: async (ideaId: string) => {
      const res = await fetch(`/api/ideas/${ideaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress' }),
      })
      if (!res.ok) throw new Error('Erro')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] })
      queryClient.invalidateQueries({ queryKey: ['articles'] })
    },
  })

  const filteredIdeas = (ideas || []).filter((i: Record<string, unknown>) =>
    !search || (i.title as string).toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <PageHeader title="Banco de Ideias" description="Gerencie ideias de temas para artigos">
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Ideia
        </Button>
      </PageHeader>

      {/* Quick Create */}
      {showCreate && (
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <select
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={newBlogId}
              onChange={(e) => setNewBlogId(e.target.value)}
            >
              <option value="">Blog...</option>
              {(blogs || []).map((b: Record<string, unknown>) => (
                <option key={b.id as string} value={b.id as string}>{b.name as string}</option>
              ))}
            </select>
            <Input
              placeholder="Título da ideia..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && newBlogId && createIdea.mutate()}
              className="flex-1"
              autoFocus
            />
            <Button size="sm" onClick={() => createIdea.mutate()} disabled={!newBlogId || !newTitle || createIdea.isPending}>
              Criar
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
              Cancelar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar ideia..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Ideas List */}
      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />)}</div>
      ) : filteredIdeas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Lightbulb className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">Nenhuma ideia ainda</h3>
            <p className="mt-2 text-sm text-muted-foreground">Adicione ideias para planejar conteúdo futuro.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredIdeas.map((idea: Record<string, unknown>) => (
            <Card key={idea.id as string} className="group">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-medium line-clamp-2">{idea.title as string}</h4>
                  <Badge className={PRIORITY_COLORS[(idea.priority as string) || 'medium'] || ''}>
                    {idea.priority as string}
                  </Badge>
                </div>
                {(idea.description as string) && (
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{String(idea.description)}</p>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px]">{idea.status as string}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => convertIdea.mutate(idea.id as string)}
                  >
                    <ArrowRight className="mr-1 h-3 w-3" />
                    Converter
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
