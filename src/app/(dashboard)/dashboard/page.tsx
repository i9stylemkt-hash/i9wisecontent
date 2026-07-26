import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, DollarSign, Star, BookOpen } from 'lucide-react'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Visão geral da sua operação de conteúdo"
      />

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Artigos"
          value="0"
          description="Total gerado"
          icon={FileText}
        />
        <StatCard
          title="Custo Mês"
          value="R$ 0,00"
          description="Este mês"
          icon={DollarSign}
        />
        <StatCard
          title="Score Médio"
          value="—"
          description="Qualidade"
          icon={Star}
        />
        <StatCard
          title="Blogs Ativos"
          value="0"
          description="Configurados"
          icon={BookOpen}
        />
      </div>

      {/* Empty State */}
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">Nenhum blog configurado</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Crie seu primeiro blog para começar a gerar conteúdo com IA.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string
  value: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}
