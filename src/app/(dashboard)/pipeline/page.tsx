import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Workflow } from 'lucide-react'

export default function PipelinePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Pipeline" description="Acompanhe as execuções do pipeline de IA" />

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Workflow className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">Nenhuma execução</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Execuções do pipeline aparecerão aqui quando forem disparadas.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
