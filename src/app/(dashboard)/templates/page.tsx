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
import { Plus, FileCode } from 'lucide-react'

export default function TemplatesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [structure, setStructure] = useState('')
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; description: string; structure: string }>>([])

  function handleCreate() {
    if (!name.trim()) return

    const newTemplate = {
      id: crypto.randomUUID(),
      name: name.trim(),
      description: description.trim(),
      structure: structure.trim(),
    }

    setTemplates((prev) => [newTemplate, ...prev])
    setName('')
    setDescription('')
    setStructure('')
    setIsDialogOpen(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Templates" description="Templates de estrutura de artigo">
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Template
        </Button>
      </PageHeader>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileCode className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">Nenhum template</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Crie templates de estrutura para padronizar seus artigos.
            </p>
            <Button className="mt-4" variant="outline" onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar primeiro template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <FileCode className="mt-0.5 h-5 w-5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <h3 className="font-medium truncate">{template.name}</h3>
                    {template.description && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {template.description}
                      </p>
                    )}
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
            <DialogTitle>Novo Template</DialogTitle>
            <DialogDescription>
              Crie um template de estrutura para padronizar artigos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="template-name">Nome</Label>
              <Input
                id="template-name"
                placeholder="Ex: Artigo Tutorial"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-description">Descrição</Label>
              <Input
                id="template-description"
                placeholder="Breve descrição do template"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-structure">Estrutura</Label>
              <Textarea
                id="template-structure"
                placeholder={"# Introdução\n## Contexto\n## Passo a passo\n# Conclusão"}
                rows={6}
                value={structure}
                onChange={(e) => setStructure(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!name.trim()}>
              Criar Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
