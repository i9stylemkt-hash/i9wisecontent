'use client'

import { useState, useMemo } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useArticles } from '@/hooks/use-articles'
import Link from 'next/link'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  addMonths,
  subMonths,
  isSameMonth,
  isToday,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const { data: articles } = useArticles()

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days = useMemo(() => eachDayOfInterval({ start: calendarStart, end: calendarEnd }), [calendarStart, calendarEnd])

  const scheduledArticles = useMemo(() => {
    if (!articles) return new Map<string, Record<string, unknown>[]>()
    const map = new Map<string, Record<string, unknown>[]>()
    for (const article of articles as Record<string, unknown>[]) {
      const date = article.scheduled_date as string | null
      if (date) {
        const key = date.split('T')[0] ?? date
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(article)
      }
    }
    return map
  }, [articles])

  return (
    <div className="space-y-6">
      <PageHeader title="Calendário Editorial" description="Planeje e visualize publicações" />

      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold capitalize">
          {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
        </h2>
        <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-2">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-px mb-1">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day) => (
              <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-px">
            {days.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd')
              const dayArticles = scheduledArticles.get(dateKey) || []
              const isCurrentMonth = isSameMonth(day, currentDate)

              return (
                <div
                  key={dateKey}
                  className={`min-h-20 rounded-md border border-transparent p-1.5 ${
                    isToday(day) ? 'border-primary/50 bg-primary/5' : ''
                  } ${!isCurrentMonth ? 'opacity-40' : ''}`}
                >
                  <span className={`text-xs ${isToday(day) ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                    {format(day, 'd')}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayArticles.slice(0, 2).map((article) => (
                      <Link key={article.id as string} href={`/articles/${article.id}`}>
                        <div className="truncate rounded bg-primary/10 px-1 py-0.5 text-[10px] text-primary hover:bg-primary/20">
                          {article.title as string}
                        </div>
                      </Link>
                    ))}
                    {dayArticles.length > 2 && (
                      <span className="text-[10px] text-muted-foreground">+{dayArticles.length - 2} mais</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
