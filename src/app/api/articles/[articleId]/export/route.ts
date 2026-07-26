import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ArticleService } from '@/lib/services/article.service'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ articleId: string }> }
) {
  try {
    const { articleId } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'md'

    let content: string
    let contentType: string
    let extension: string

    if (format === 'html') {
      content = await ArticleService.exportHtml(articleId, user.id)
      contentType = 'text/html'
      extension = 'html'
    } else {
      content = await ArticleService.exportMarkdown(articleId, user.id)
      contentType = 'text/markdown'
      extension = 'md'
    }

    return new NextResponse(content, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="article.${extension}"`,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Erro ao exportar artigo' }, { status: 500 })
  }
}
