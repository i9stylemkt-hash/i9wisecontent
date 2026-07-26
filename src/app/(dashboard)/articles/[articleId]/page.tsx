'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useArticle, useUpdateArticle, useDeleteArticle } from '@/hooks/use-articles'
import { ArrowLeft, Save, Trash2, Download, Eye, Edit3 } from 'lucide-react'
import Link from 'next/link'
import { ARTICLE_STATUSES } from '@/lib/utils/constants'

export default function ArticleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const articleId = params.articleId as string
  const { data: article, isLoading } = useArticle(articleId)
  const updateArticle = useUpdateArticle()
  const deleteArticle = useDeleteArticle()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [metaDescription, setMetaDescription] = useState('')
  const [status, setStatus] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    if (article) {
      const a = article as Record<string, unknown>
      setTitle((a.title as string) || '')
      setContent((a.content_markdown as string) || '')
      setMetaDescription((a.meta_description as string) || '')
      setStatus((a.status as string) || '')
    }
  }, [article])

  const handleSave = useCallback(async () => {
    await updateArticle.mutateAsync({
      id: articleId,
      data: { title, contentMarkdown: content, metaDescription, status: status as 'idea' | 'planning' | 'researching' | 'writing' | 'reviewing' | 'revision' | 'ready' | 'published' | 'archived' },
    })
    setIsDirty(false)
  }, [articleId, title, content, metaDescription, status, updateArticle])

  async function handleDelete() {
    if (!confirm('Tem certeza que deseja excluir este artigo?')) return
    await deleteArticle.mutateAsync(articleId)
    router.push('/articles')
  }

  async function handleExport(format: 'md' | 'html') {
    const res = await fetch(`/api/articles/${articleId}/export?format=${format}`)
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title || 'artigo'}.${format === 'md' ? 'md' : 'html'}`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return <div className="animate-pulse space-y-4"><div className="h-8 w-64 rounded bg-muted" /><div className="h-96 rounded bg-muted" /></div>
  }

  const qualityScore = (article as Record<string, unknown>)?.quality_score as number | null

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/articles">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <Input
            value={title}
            onChange={(e) => { setTitle(e.target.value); setIsDirty(true) }}
            className="border-none bg-transparent text-lg font-semibold p-0 h-auto focus-visible:ring-0"
            placeholder="Título do artigo"
          />
        </div>
        <div className="flex items-center gap-2">
          {qualityScore && (
            <Badge variant="secondary">⭐ {qualityScore}/10</Badge>
          )}
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setIsDirty(true) }}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            {ARTICLE_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? <Edit3 className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!isDirty || updateArticle.isPending}>
            <Save className="mr-1.5 h-3.5 w-3.5" />
            Salvar
          </Button>
        </div>
      </div>

      {/* Editor / Preview */}
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Card className="min-h-[500px]">
          <CardContent className="p-0">
            {showPreview ? (
              <div className="prose prose-invert max-w-none p-6 text-sm">
                <div dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(content) }} />
              </div>
            ) : (
              <Textarea
                value={content}
                onChange={(e) => { setContent(e.target.value); setIsDirty(true) }}
                placeholder="Escreva o conteúdo do artigo em Markdown..."
                className="min-h-[500px] resize-none rounded-none border-0 font-mono text-sm focus-visible:ring-0"
              />
            )}
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Meta Description</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={metaDescription}
                onChange={(e) => { setMetaDescription(e.target.value); setIsDirty(true) }}
                placeholder="Descrição para SEO (max 160 chars)"
                maxLength={160}
                className="text-xs"
                rows={3}
              />
              <p className="mt-1 text-[10px] text-muted-foreground">{metaDescription.length}/160</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Ações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => handleExport('md')}>
                <Download className="mr-2 h-3.5 w-3.5" />
                Baixar Markdown
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => handleExport('html')}>
                <Download className="mr-2 h-3.5 w-3.5" />
                Baixar HTML
              </Button>
              <Button variant="destructive" size="sm" className="w-full justify-start" onClick={handleDelete}>
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Excluir Artigo
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

/** Simple MD→HTML for preview (basic, without heavy deps on client) */
function simpleMarkdownToHtml(md: string): string {
  return md
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>')
    .replace(/`(.*?)`/gim, '<code>$1</code>')
    .replace(/\n/gim, '<br>')
}
