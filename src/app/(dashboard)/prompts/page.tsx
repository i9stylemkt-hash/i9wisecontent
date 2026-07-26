import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, MessageSquare } from 'lucide-react'

export default function PromptsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Prompts" description="Biblioteca de prompts reutilizáveis">
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Prompt
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">Nenhum prompt</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Crie prompts personalizados para os agentes de IA.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
