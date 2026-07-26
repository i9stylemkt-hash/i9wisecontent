import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, FileCode } from 'lucide-react'

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Templates" description="Templates de estrutura de artigo">
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Template
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileCode className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">Nenhum template</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Crie templates de estrutura para padronizar seus artigos.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
