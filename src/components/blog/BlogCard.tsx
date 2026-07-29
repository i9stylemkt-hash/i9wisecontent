'use client'

import { Globe, FileText } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export interface BlogCardProps {
  id: string
  name: string
  niche: string
  isActive: boolean
  articleCount: number
  slug?: string
  onClick?: (id: string) => void
}

export function BlogCard({ id, name, niche, isActive, articleCount, slug, onClick }: BlogCardProps) {
  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => onClick?.(id)}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="truncate">{name}</CardTitle>
          <Badge variant={isActive ? 'default' : 'secondary'}>
            {isActive ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
        <CardDescription className="flex items-center gap-1">
          <Globe className="h-3 w-3" />
          {niche}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span>{articleCount} {articleCount === 1 ? 'artigo' : 'artigos'}</span>
        </div>
      </CardContent>
      {slug && (
        <CardFooter>
          <span className="text-xs text-muted-foreground">/{slug}</span>
        </CardFooter>
      )}
    </Card>
  )
}
