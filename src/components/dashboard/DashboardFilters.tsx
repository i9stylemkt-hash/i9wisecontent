'use client'

import { useQueryStates, parseAsString } from 'nuqs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export interface DashboardFiltersProps {
  blogs: Array<{ id: string; name: string }>
}

export function DashboardFilters({ blogs }: DashboardFiltersProps) {
  const [filters, setFilters] = useQueryStates({
    blog: parseAsString.withDefault('all'),
    period: parseAsString.withDefault('30d'),
  })

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Select
        value={filters.blog}
        onValueChange={(value) => setFilters({ blog: value })}
      >
        <SelectTrigger className="w-50">
          <SelectValue placeholder="Selecionar blog" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os blogs</SelectItem>
          {blogs.map((blog) => (
            <SelectItem key={blog.id} value={blog.id}>
              {blog.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.period}
        onValueChange={(value) => setFilters({ period: value })}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7d">Últimos 7 dias</SelectItem>
          <SelectItem value="30d">Últimos 30 dias</SelectItem>
          <SelectItem value="90d">Últimos 90 dias</SelectItem>
          <SelectItem value="custom">Personalizado</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
