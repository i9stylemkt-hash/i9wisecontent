'use client'

import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, DollarSign, Star, BookOpen, ArrowUpRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useBlogs } from '@/hooks/use-blogs'
import { useArticles } from '@/hooks/use-articles'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'

export default function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ['metrics', 'dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/metrics?type=dashboard')
      if (!res.ok) return null
      return res.json()
    },
  })

  const { data: blogs } = useBlogs()
  const { data: articles } = useArticles()

  const recentArticles = (articles || []).slice(0, 5)

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Visão geral da sua operação de conteúdo">
        <Link href="/blogs/new" className={buttonVariants({ size: 'sm' })}>
          + Novo Blog
        </Link>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Artigos"
          value={String(stats?.totalArticles ?? 0)}
          description={`+${stats?.articlesThisWeek ?? 0} esta semana`}
          icon={FileText}
        />
        <StatCard
          title="Custo Mês"
          value={`R$ ${stats?.monthCost?.toFixed(2) ?? '0,00'}`}
          description="Este mês"
          icon={DollarSign}
        />
        <StatCard
          title="Score Médio"
          value={stats?.avgScore ? String(stats.avgScore) : '—'}
          description="Qualidade"
          icon={Star}
        />
        <StatCard
          title="Blogs Ativos"
          value={String(stats?.activeBlogs ?? 0)}
          description="Configurados"
          icon={BookOpen}
        />
      </div>

      {/* Blog Summary Cards */}
      {blogs && blogs.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Seus Blogs</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(blogs as Record<string, unknown>[]).map((blog) => (
              <Link key={blog.id as string} href={`/blogs/${blog.id}`}>
                <Card className="hover:bg-accent/30 transition-colors cursor-pointer">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                      {blog.name as string}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">{blog.niche as string}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {(blog.is_active as boolean) ? 'Ativo' : 'Pausado'}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {blog.publication_frequency as string}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Articles */}
      {recentArticles.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-muted-foreground">Artigos Recentes</h2>
            <Link href="/articles" className="text-xs text-primary hover:underline flex items-center gap-1">
              Ver todos <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <Card>
            <CardContent className="divide-y divide-border py-0">
              {(recentArticles as Record<string, unknown>[]).map((article) => (
                <Link
                  key={article.id as string}
                  href={`/articles/${article.id}`}
                  className="flex items-center justify-between py-3 hover:bg-accent/20 -mx-6 px-6 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{article.title as string}</p>
                    <p className="text-xs text-muted-foreground">{article.status as string}</p>
                  </div>
                  {(article.quality_score as number) > 0 && (
                    <Badge variant="secondary">{String(article.quality_score)}/10</Badge>
                  )}
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty state if no blogs */}
      {(!blogs || blogs.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">Nenhum blog configurado</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Crie seu primeiro blog para começar a gerar conteúdo com IA.
            </p>
            <Link href="/blogs/new" className={buttonVariants({ className: 'mt-4' })}>
              Criar primeiro blog
            </Link>
          </CardContent>
        </Card>
      )}
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
