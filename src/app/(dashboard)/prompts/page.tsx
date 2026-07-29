'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Plus, MessageSquare } from 'lucide-react'

export default function PromptsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [content, setContent] = useState('')
  const [prompts, setPrompts] = useState<Array<{ id: string; name: string; description: string; content: string }>>([])

  function handleCreate() {
    if (!name.trim() || !content.trim()) return

    const newPrompt = {
      id: crypto.randomUUID(),
      name: name.trim(),
      description: description.trim(),
      content: content.trim(),
    }

    setPrompts((prev) => [newPrompt, ...prev])
    setName('')
    setDescription('')
    setContent('')
    setIsDialogOpen(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Prompts" description="Biblioteca de prompts reutilizáveis">
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Prompt
        </Button>
      </PageHeader>

      {prompts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">Nenhum prompt</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Crie prompts personalizados para os agentes de IA.
            </p>
            <Button className="mt-4" variant="outline" onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar primeiro prompt
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {prompts.map((prompt) => (
            <Card key={prompt.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <MessageSquare className="mt-0.5 h-5 w-5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <h3 className="font-medium truncate">{prompt.name}</h3>
                    {prompt.description && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {prompt.description}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground font-mono line-clamp-3">
                      {prompt.content}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={(open) => setIsDialogOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Prompt</DialogTitle>
            <DialogDescription>
              Crie um prompt reutilizável para os agentes de IA.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="prompt-name">Nome</Label>
              <Input
                id="prompt-name"
                placeholder="Ex: Gerador de Headlines"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prompt-description">Descrição</Label>
              <Input
                id="prompt-description"
                placeholder="Breve descrição do prompt"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prompt-content">Conteúdo do Prompt</Label>
              <Textarea
                id="prompt-content"
                placeholder="Escreva o prompt aqui. Use {variavel} para parâmetros dinâmicos..."
                rows={8}
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!name.trim() || !content.trim()}>
              Criar Prompt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
