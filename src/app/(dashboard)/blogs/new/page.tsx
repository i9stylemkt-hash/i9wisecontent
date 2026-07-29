'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCreateBlog } from '@/hooks/use-blogs'
import type { CreateBlogInput } from '@/lib/validations/blog'

const STEPS = ['Básico', 'Conteúdo', 'Automação', 'Revisão']

export default function NewBlogPage() {
  const router = useRouter()
  const createBlog = useCreateBlog()
  const [step, setStep] = useState(0)
  const [formData, setFormData] = useState<Partial<CreateBlogInput>>({
    name: '',
    niche: '',
    description: '',
    toneOfVoice: '',
    authorPersona: '',
    targetAudience: '',
    keywords: [],
    contentLanguage: 'pt-BR',
    publicationFrequency: 'weekly',
    automationLevel: 'approve_final',
    qualityThreshold: 7,
    humanReviewRequired: true,
  })

  function updateField<K extends keyof CreateBlogInput>(key: K, value: CreateBlogInput[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit() {
    try {
      await createBlog.mutateAsync(formData as CreateBlogInput)
      router.push('/blogs')
    } catch {
      // Error handled by mutation — displayed below
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Criar Blog" description="Configure um novo blog passo a passo" />

      {/* Progress */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                i <= step
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {i + 1}
            </div>
            <span className={`text-xs ${i <= step ? 'text-foreground' : 'text-muted-foreground'}`}>
              {s}
            </span>
            {i < STEPS.length - 1 && <div className="h-px w-8 bg-border" />}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{STEPS[step]}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Blog *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Tech Insights"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="niche">Nicho/Tema Principal *</Label>
                <Input
                  id="niche"
                  placeholder="Ex: Tecnologia e Desenvolvimento"
                  value={formData.niche}
                  onChange={(e) => updateField('niche', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Breve descrição do blog..."
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="tone">Tom de Voz</Label>
                <Input
                  id="tone"
                  placeholder="Ex: Profissional mas acessível"
                  value={formData.toneOfVoice}
                  onChange={(e) => updateField('toneOfVoice', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="persona">Persona do Autor</Label>
                <Input
                  id="persona"
                  placeholder="Ex: Desenvolvedor sênior com 10 anos de exp"
                  value={formData.authorPersona}
                  onChange={(e) => updateField('authorPersona', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="audience">Público-alvo</Label>
                <Input
                  id="audience"
                  placeholder="Ex: Desenvolvedores júnior a pleno"
                  value={formData.targetAudience}
                  onChange={(e) => updateField('targetAudience', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="keywords">Palavras-chave (separadas por vírgula)</Label>
                <Input
                  id="keywords"
                  placeholder="Ex: react, typescript, nextjs"
                  value={formData.keywords?.join(', ')}
                  onChange={(e) =>
                    updateField(
                      'keywords',
                      e.target.value.split(',').map((k) => k.trim()).filter(Boolean)
                    )
                  }
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label>Frequência de Publicação</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={formData.publicationFrequency}
                  onChange={(e) => updateField('publicationFrequency', e.target.value as CreateBlogInput['publicationFrequency'])}
                >
                  <option value="daily">Diária</option>
                  <option value="twice_weekly">2x por semana</option>
                  <option value="weekly">Semanal</option>
                  <option value="biweekly">Quinzenal</option>
                  <option value="monthly">Mensal</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Nível de Automação</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={formData.automationLevel}
                  onChange={(e) => updateField('automationLevel', e.target.value as CreateBlogInput['automationLevel'])}
                >
                  <option value="full_auto">Totalmente automático</option>
                  <option value="approve_final">Aprovar artigo final</option>
                  <option value="approve_each_step">Aprovar cada etapa</option>
                  <option value="manual_trigger">Disparo manual</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Threshold de Qualidade: {formData.qualityThreshold}/10</Label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={formData.qualityThreshold}
                  onChange={(e) => updateField('qualityThreshold', Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="review"
                  checked={formData.humanReviewRequired}
                  onChange={(e) => updateField('humanReviewRequired', e.target.checked)}
                />
                <Label htmlFor="review">Revisão humana obrigatória</Label>
              </div>
            </>
          )}

          {step === 3 && (
            <div className="space-y-3 text-sm">
              <h4 className="font-medium">Resumo da configuração:</h4>
              <div className="grid gap-2 rounded-md border border-border p-4">
                <p><span className="text-muted-foreground">Nome:</span> {formData.name}</p>
                <p><span className="text-muted-foreground">Nicho:</span> {formData.niche}</p>
                <p><span className="text-muted-foreground">Tom:</span> {formData.toneOfVoice || '—'}</p>
                <p><span className="text-muted-foreground">Público:</span> {formData.targetAudience || '—'}</p>
                <p><span className="text-muted-foreground">Frequência:</span> {formData.publicationFrequency}</p>
                <p><span className="text-muted-foreground">Automação:</span> {formData.automationLevel}</p>
                <p><span className="text-muted-foreground">Qualidade mínima:</span> {formData.qualityThreshold}/10</p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              disabled={step === 0}
            >
              Anterior
            </Button>
            {step < STEPS.length - 1 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={step === 0 && (!formData.name || !formData.niche)}
              >
                Próximo
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={createBlog.isPending}>
                {createBlog.isPending ? 'Criando...' : 'Criar Blog'}
              </Button>
            )}
          </div>

          {createBlog.isError && (
            <p className="text-sm text-destructive">
              {createBlog.error?.message || 'Erro ao criar blog. Verifique os campos e tente novamente.'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
