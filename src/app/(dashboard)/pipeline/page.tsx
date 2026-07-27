'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Workflow, Play, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useBlogs } from '@/hooks/use-blogs'

const STATUS_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  queued: { icon: Clock, color: 'text-muted-foreground', label: 'Na fila' },
  running: { icon: Loader2, color: 'text-info', label: 'Executando' },
  completed: { icon: CheckCircle, color: 'text-success', label: 'Concluído' },
  failed: { icon: XCircle, color: 'text-destructive', label: 'Falhou' },
  cancelled: { icon: XCircle, color: 'text-muted-foreground', label: 'Cancelado' },
}

const STAGE_LABELS: Record<string, string> = {
  planning: 'Planejando',
  research: 'Pesquisando',
  generation: 'Gerando',
  review: 'Revisando',
  completed: 'Concluído',
}

export default function PipelinePage() {
  const queryClient = useQueryClient()
  const { data: blogs } = useBlogs()
  const [selectedBlog, setSelectedBlog] = useState('')

  const { data: runs, isLoading } = useQuery({
    queryKey: ['pipeline-runs'],
    queryFn: async () => {
      const res = await fetch('/api/pipeline')
      if (!res.ok) return []
      return res.json()
    },
    refetchInterval: 5000, // Poll every 5s for active pipelines
  })

  const triggerPipeline = useMutation({
    mutationFn: async (blogId: string) => {
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blogId }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao executar pipeline')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-runs'] })
      queryClient.invalidateQueries({ queryKey: ['articles'] })
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Pipeline" description="Execuções do pipeline de IA">
        <div className="flex items-center gap-2">
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            value={selectedBlog}
            onChange={(e) => setSelectedBlog(e.target.value)}
          >
            <option value="">Selecionar blog...</option>
            {(blogs as Record<string, unknown>[] || []).map((b) => (
              <option key={b.id as string} value={b.id as string}>{b.name as string}</option>
            ))}
          </select>
          <Button
            size="sm"
            onClick={() => selectedBlog && triggerPipeline.mutate(selectedBlog)}
            disabled={!selectedBlog || triggerPipeline.isPending}
          >
            <Play className="mr-1.5 h-3.5 w-3.5" />
            {triggerPipeline.isPending ? 'Gerando...' : 'Gerar Artigo'}
          </Button>
        </div>
      </PageHeader>

      {triggerPipeline.isError && (
        <Card className="border-destructive/50">
          <CardContent className="py-3 text-sm text-destructive">
            {triggerPipeline.error?.message}
          </CardContent>
        </Card>
      )}

      {/* Pipeline Runs */}
      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />)}</div>
      ) : !runs?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Workflow className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">Nenhuma execução</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Selecione um blog e clique em &ldquo;Gerar Artigo&rdquo; para executar o pipeline.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(runs as Record<string, unknown>[]).map((run) => {
            const status = (run.status as string) || 'queued'
            const config = STATUS_CONFIG[status] || STATUS_CONFIG.queued!
            const Icon = config.icon

            return (
              <Card key={run.id as string}>
                <CardContent className="flex items-center gap-4 py-3">
                  <Icon className={`h-5 w-5 shrink-0 ${config.color} ${status === 'running' ? 'animate-spin' : ''}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">Pipeline #{(run.id as string).slice(0, 8)}</p>
                      <Badge variant="secondary" className="text-[10px]">
                        {config.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {run.current_stage ? `Estágio: ${STAGE_LABELS[(run.current_stage as string)] || run.current_stage}` : ''}
                      {run.duration_ms ? ` · ${Math.round((run.duration_ms as number) / 1000)}s` : ''}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {run.created_at ? new Date(run.created_at as string).toLocaleString('pt-BR') : ''}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
