'use client'

import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useQuery } from '@tanstack/react-query'
import { DollarSign } from 'lucide-react'

export default function CostsPage() {
  const { data: costs, isLoading } = useQuery({
    queryKey: ['metrics', 'costs'],
    queryFn: async () => {
      const res = await fetch('/api/metrics?type=costs&days=30')
      if (!res.ok) return null
      return res.json()
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Custos" description="Métricas de custo dos últimos 30 dias" />

      {/* Total */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Custo Total (30 dias)</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            R$ {costs?.total?.toFixed(2) ?? '0,00'}
          </div>
        </CardContent>
      </Card>

      {/* By Provider */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Por Provider</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-8 animate-pulse rounded bg-muted" />)}</div>
          ) : !costs?.byProvider?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum custo registrado ainda.</p>
          ) : (
            <div className="space-y-3">
              {(costs.byProvider as Array<{ provider: string; cost: number }>).map((item) => (
                <div key={item.provider} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{item.provider}</span>
                  <span className="text-sm font-medium">R$ {item.cost.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* By Day */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico Diário</CardTitle>
        </CardHeader>
        <CardContent>
          {!costs?.byDay?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sem dados para o período.</p>
          ) : (
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {(costs.byDay as Array<{ date: string; cost: number }>).map((item) => (
                <div key={item.date} className="flex items-center justify-between py-1 text-xs">
                  <span className="text-muted-foreground">{item.date}</span>
                  <span className="font-mono">R$ {item.cost.toFixed(4)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
