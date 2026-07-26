import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { FileText } from 'lucide-react'

export default function ArticlesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Artigos" description="Todos os artigos dos seus blogs" />

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">Nenhum artigo ainda</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Artigos aparecerão aqui quando forem gerados pelo pipeline ou criados manualmente.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
