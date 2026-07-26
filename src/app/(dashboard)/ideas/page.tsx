import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Lightbulb } from 'lucide-react'

export default function IdeasPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Banco de Ideias" description="Gerencie ideias de temas para artigos">
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nova Ideia
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Lightbulb className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">Nenhuma ideia ainda</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Adicione ideias de temas manualmente ou deixe o agente de planejamento sugerir.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
