import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar } from 'lucide-react'

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Calendário Editorial" description="Planeje e visualize publicações" />

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">Calendário vazio</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Agende artigos para visualizá-los no calendário editorial.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
