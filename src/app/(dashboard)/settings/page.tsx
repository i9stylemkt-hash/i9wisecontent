import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Brain, DollarSign, Settings } from 'lucide-react'
import Link from 'next/link'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" description="Configure o sistema" />

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/settings/ai-models">
          <Card className="cursor-pointer transition-colors hover:bg-accent/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Brain className="h-5 w-5" />
                Modelos de IA
              </CardTitle>
              <CardDescription>
                Gerencie chaves de API e configure modelos de IA
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/settings/costs">
          <Card className="cursor-pointer transition-colors hover:bg-accent/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-5 w-5" />
                Custos
              </CardTitle>
              <CardDescription>
                Visualize métricas de custo e uso de tokens
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  )
}
