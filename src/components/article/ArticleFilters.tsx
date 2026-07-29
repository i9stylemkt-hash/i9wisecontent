'use client'

import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export interface ArticleFiltersProps {
  blogs: Array<{ id: string; name: string }>
  selectedBlogId: string
  onBlogChange: (blogId: string | null) => void
  statusFilter: string
  onStatusChange: (status: string | null) => void
  periodFilter: string
  onPeriodChange: (period: string | null) => void
  searchQuery?: string
  onSearchChange?: (query: string) => void
}

export function ArticleFilters({
  blogs,
  selectedBlogId,
  onBlogChange,
  statusFilter,
  onStatusChange,
  periodFilter,
  onPeriodChange,
  searchQuery,
  onSearchChange,
}: ArticleFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      {onSearchChange && (
        <div className="relative flex-1 sm:min-w-50">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar artigos..."
            value={searchQuery ?? ''}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>
      )}

      <Select value={selectedBlogId} onValueChange={onBlogChange}>
        <SelectTrigger className="w-45">
          <SelectValue placeholder="Blog" />
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

      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="idea">Ideia</SelectItem>
          <SelectItem value="planning">Planejando</SelectItem>
          <SelectItem value="researching">Pesquisando</SelectItem>
          <SelectItem value="writing">Escrevendo</SelectItem>
          <SelectItem value="reviewing">Revisando</SelectItem>
          <SelectItem value="ready">Pronto</SelectItem>
          <SelectItem value="published">Publicado</SelectItem>
          <SelectItem value="archived">Arquivado</SelectItem>
        </SelectContent>
      </Select>

      <Select value={periodFilter} onValueChange={onPeriodChange}>
        <SelectTrigger className="w-35">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todo período</SelectItem>
          <SelectItem value="7d">Últimos 7 dias</SelectItem>
          <SelectItem value="30d">Últimos 30 dias</SelectItem>
          <SelectItem value="90d">Últimos 90 dias</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
