'use client'

import { PageHeader } from '@/components/shared/page-header'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Plus, BookOpen, Globe, FileText } from 'lucide-react'
import Link from 'next/link'
import { useBlogs } from '@/hooks/use-blogs'

interface Blog {
  id: string
  name: string
  slug: string
  niche: string
  is_active: boolean
  articles?: { count: number }[]
  created_at: string
}

function BlogCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-16" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
      </CardContent>
    </Card>
  )
}

function BlogCard({ blog }: { blog: Blog }) {
  const articleCount =
    Array.isArray(blog.articles) && blog.articles.length > 0
      ? (blog.articles[0]?.count ?? 0)
      : 0

  return (
    <Link href={`/blogs/${blog.id}`}>
      <Card className="transition-colors hover:border-primary/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{blog.name}</CardTitle>
            <Badge variant={blog.is_active ? 'default' : 'secondary'}>
              {blog.is_active ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Globe className="h-3.5 w-3.5" />
            <span>{blog.niche}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            <span>
              {articleCount} {articleCount === 1 ? 'artigo' : 'artigos'}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export default function BlogsPage() {
  const { data: blogs, isLoading, error } = useBlogs()

  return (
    <div className="space-y-6">
      <PageHeader title="Blogs" description="Gerencie seus blogs e configurações">
        <Link href="/blogs/new" className={buttonVariants()}>
          <Plus className="mr-2 h-4 w-4" />
          Criar Blog
        </Link>
      </PageHeader>

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <BlogCardSkeleton />
          <BlogCardSkeleton />
          <BlogCardSkeleton />
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-destructive">
              Erro ao carregar blogs. Tente novamente.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && Array.isArray(blogs) && blogs.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">Nenhum blog ainda</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Crie seu primeiro blog para começar a gerar conteúdo automaticamente.
            </p>
            <Link href="/blogs/new" className={buttonVariants({ className: 'mt-4' })}>
              <Plus className="mr-2 h-4 w-4" />
              Criar primeiro blog
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Blog Grid */}
      {!isLoading && !error && Array.isArray(blogs) && blogs.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {blogs.map((blog: Blog) => (
            <BlogCard key={blog.id} blog={blog} />
          ))}
        </div>
      )}
    </div>
  )
}
