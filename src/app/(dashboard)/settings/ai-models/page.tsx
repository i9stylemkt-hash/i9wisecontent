'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Key, Trash2, CheckCircle, XCircle } from 'lucide-react'

const PROVIDERS = [
  { id: 'google', label: 'Google (Gemini)', icon: '🟡' },
  { id: 'anthropic', label: 'Anthropic (Claude)', icon: '🟠' },
  { id: 'groq', label: 'Groq', icon: '🔵' },
  { id: 'openrouter', label: 'OpenRouter', icon: '🟣' },
]

export default function AIModelsPage() {
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [newProvider, setNewProvider] = useState('google')
  const [newKey, setNewKey] = useState('')
  const [newAlias, setNewAlias] = useState('')

  const { data: keys, isLoading } = useQuery({
    queryKey: ['ai-keys'],
    queryFn: async () => {
      const res = await fetch('/api/ai/keys')
      if (!res.ok) return []
      return res.json()
    },
  })

  const addKey = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/ai/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: newProvider, key: newKey, alias: newAlias || undefined }),
      })
      if (!res.ok) throw new Error('Erro ao adicionar chave')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-keys'] })
      setNewKey('')
      setNewAlias('')
      setShowAdd(false)
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Modelos de IA" description="Gerencie chaves de API e modelos">
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Adicionar Chave
        </Button>
      </PageHeader>

      {/* Add Key Form */}
      {showAdd && (
        <Card>
          <CardContent className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Provider</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={newProvider}
                  onChange={(e) => setNewProvider(e.target.value)}
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Alias (opcional)</Label>
                <Input value={newAlias} onChange={(e) => setNewAlias(e.target.value)} placeholder="Minha chave" />
              </div>
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input type="password" value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="sk-..." />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => addKey.mutate()} disabled={!newKey || addKey.isPending}>
                {addKey.isPending ? 'Salvando...' : 'Salvar Chave'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Keys List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chaves Configuradas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded bg-muted" />)}</div>
          ) : !keys?.length ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhuma chave configurada. Adicione uma para usar os agentes de IA.
            </p>
          ) : (
            <div className="space-y-2">
              {(keys as Record<string, unknown>[]).map((key) => {
                const provider = PROVIDERS.find((p) => p.id === key.provider)
                return (
                  <div key={key.id as string} className="flex items-center justify-between rounded-md border border-border p-3">
                    <div className="flex items-center gap-3">
                      <Key className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{key.key_alias as string || key.provider as string}</p>
                        <p className="text-xs text-muted-foreground">{provider?.label || key.provider as string}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={(key.is_active as boolean) ? 'default' : 'secondary'}>
                        {(key.is_active as boolean) ? 'Ativa' : 'Inativa'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{String(key.usage_count || 0)} usos</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Model Config Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuração dos Agentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { name: 'Planejador', model: 'gemini-2.0-flash', provider: 'Google' },
              { name: 'Pesquisador', model: 'gemini-2.0-flash', provider: 'Google' },
              { name: 'Escritor', model: 'claude-sonnet-4', provider: 'Anthropic' },
              { name: 'Revisor', model: 'gemini-2.0-flash', provider: 'Google' },
            ].map((agent) => (
              <div key={agent.name} className="rounded-md border border-border p-3">
                <p className="text-sm font-medium">{agent.name}</p>
                <p className="text-xs text-muted-foreground">{agent.model} ({agent.provider})</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
