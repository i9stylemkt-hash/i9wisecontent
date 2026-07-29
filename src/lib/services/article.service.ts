import { createServerSupabaseClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils'
import { isValidTransition } from '@/lib/validations/article'
import { Logger } from '@/lib/utils/logger'
import type { CreateArticleInput, UpdateArticleInput } from '@/lib/validations/article'

const logger = new Logger('ArticleService')

interface ArticleFilters {
  blogId?: string
  status?: string
  search?: string
  limit?: number
  offset?: number
}

export class ArticleService {
  static async getAll(userId: string, filters?: ArticleFilters) {
    const supabase = await createServerSupabaseClient()

    let query = supabase
      .from('articles')
      .select('*, blogs!inner(user_id)')
      .eq('blogs.user_id', userId)
      .order('created_at', { ascending: false })

    if (filters?.blogId) {
      query = query.eq('blog_id', filters.blogId)
    }
    if (filters?.status) {
      const statuses = filters.status.split(',')
      query = query.in('status', statuses)
    }
    if (filters?.search) {
      query = query.ilike('title', `%${filters.search}%`)
    }
    if (filters?.limit) {
      query = query.limit(filters.limit)
    }
    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  }

  static async getByBlog(blogId: string, userId: string) {
    const supabase = await createServerSupabaseClient()

    // Verify blog ownership
    const { data: blog, error: blogError } = await supabase
      .from('blogs')
      .select('id')
      .eq('id', blogId)
      .eq('user_id', userId)
      .single()

    if (blogError || !blog) throw new Error('Blog não encontrado')

    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('blog_id', blogId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  static async getById(id: string, userId: string) {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from('articles')
      .select('*, blogs!inner(user_id, name, niche)')
      .eq('id', id)
      .eq('blogs.user_id', userId)
      .single()

    if (error) throw error
    return data
  }

  static async create(input: CreateArticleInput, userId: string) {
    const supabase = await createServerSupabaseClient()

    // Verify blog ownership
    const { data: blog, error: blogError } = await supabase
      .from('blogs')
      .select('id')
      .eq('id', input.blogId)
      .eq('user_id', userId)
      .single()

    if (blogError || !blog) throw new Error('Blog não encontrado')

    const slug = slugify(input.title)

    // Try with full schema first (after migration)
    const insertData = {
      blog_id: input.blogId,
      user_id: userId,
      title: input.title,
      slug,
      meta_description: input.metaDescription ?? null,
      content_markdown: input.contentMarkdown ?? null,
      content: input.contentMarkdown ?? null,
      summary: input.summary ?? null,
      tags: input.tags ?? [],
      keywords: input.tags ?? [],
      status: input.status ?? 'idea',
      scheduled_date: input.scheduledDate ?? null,
    }

    const { data, error } = await supabase
      .from('articles')
      .insert(insertData)
      .select()
      .single()

    // If columns don't exist, fallback to minimal schema
    if (error && (error.message?.includes('column') || error.code === '42703')) {
      logger.warn('Full article insert failed, trying minimal schema', { errorMessage: error.message })
      const minimalData = {
        blog_id: input.blogId,
        user_id: userId,
        title: input.title,
        slug,
        content: input.contentMarkdown ?? null,
        meta_description: input.metaDescription ?? null,
        summary: input.summary ?? null,
        keywords: input.tags ?? [],
        status: input.status ?? 'idea',
      }

      const { data: fallbackData, error: fallbackError } = await supabase
        .from('articles')
        .insert(minimalData)
        .select()
        .single()

      if (fallbackError) throw fallbackError
      return fallbackData
    }

    if (error) throw error
    return data
  }

  static async update(id: string, input: UpdateArticleInput, userId: string) {
    const supabase = await createServerSupabaseClient()

    // If status is being changed, validate transition
    if (input.status) {
      const article = await this.getById(id, userId)
      const currentStatus = (article as { status: string }).status
      // Only validate if status is actually changing
      if (input.status !== currentStatus && !isValidTransition(currentStatus, input.status)) {
        throw new Error(`Transição inválida: ${currentStatus} → ${input.status}`)
      }
    }

    const updateData: Record<string, unknown> = {}
    if (input.title !== undefined) {
      updateData.title = input.title
      updateData.slug = slugify(input.title)
    }
    if (input.metaDescription !== undefined) updateData.meta_description = input.metaDescription
    if (input.contentMarkdown !== undefined) {
      updateData.content_markdown = input.contentMarkdown
      updateData.content = input.contentMarkdown // fallback column name
    }
    if (input.summary !== undefined) updateData.summary = input.summary
    if (input.tags !== undefined) {
      updateData.tags = input.tags
      updateData.keywords = input.tags // fallback column name
    }
    if (input.status !== undefined) updateData.status = input.status
    if (input.scheduledDate !== undefined) updateData.scheduled_date = input.scheduledDate
    if (input.qualityScore !== undefined) updateData.quality_score = input.qualityScore

    const { data, error } = await supabase
      .from('articles')
      .select('*, blogs!inner(user_id)')
      .eq('id', id)
      .eq('blogs.user_id', userId)

    if (error || !data?.length) throw new Error('Artigo não encontrado')

    const { data: updated, error: updateError } = await supabase
      .from('articles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    // If columns don't exist, retry without new columns
    if (updateError && (updateError.message?.includes('column') || updateError.code === '42703')) {
      logger.warn('Full article update failed, trying without new columns', { errorMessage: updateError.message })
      // Remove columns that might not exist
      delete updateData.content_markdown
      delete updateData.tags
      delete updateData.scheduled_date
      delete updateData.quality_score

      const { data: fallback, error: fallbackErr } = await supabase
        .from('articles')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (fallbackErr) throw fallbackErr
      return fallback
    }

    if (updateError) throw updateError
    return updated
  }

  static async delete(id: string, userId: string) {
    const supabase = await createServerSupabaseClient()

    // Verify ownership via blog
    const { data } = await supabase
      .from('articles')
      .select('*, blogs!inner(user_id)')
      .eq('id', id)
      .eq('blogs.user_id', userId)

    if (!data?.length) throw new Error('Artigo não encontrado')

    const { error } = await supabase.from('articles').delete().eq('id', id)
    if (error) throw error
  }

  static async exportMarkdown(id: string, userId: string): Promise<string> {
    const article = await this.getById(id, userId)
    const a = article as Record<string, unknown>

    const frontmatter = [
      '---',
      `title: "${a.title}"`,
      a.meta_description ? `description: "${a.meta_description}"` : null,
      a.tags ? `tags: [${(a.tags as string[]).map(t => `"${t}"`).join(', ')}]` : null,
      a.scheduled_date ? `date: "${a.scheduled_date}"` : null,
      '---',
      '',
    ].filter(Boolean).join('\n')

    return frontmatter + ((a.content_markdown as string) || '')
  }

  static async exportHtml(id: string, userId: string): Promise<string> {
    const { marked } = await import('marked')
    const article = await this.getById(id, userId)
    const a = article as Record<string, unknown>
    const content = (a.content_markdown as string) || ''
    const htmlContent = await marked(content)

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${a.title}</title>
  ${a.meta_description ? `<meta name="description" content="${a.meta_description}">` : ''}
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; color: #1a1a1a; }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    h2 { font-size: 1.5rem; margin-top: 2rem; }
    h3 { font-size: 1.25rem; }
    code { background: #f4f4f5; padding: 0.2em 0.4em; border-radius: 3px; font-size: 0.9em; }
    pre { background: #18181b; color: #fafafa; padding: 1rem; border-radius: 8px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 3px solid #6366f1; padding-left: 1rem; color: #52525b; }
    a { color: #6366f1; }
  </style>
</head>
<body>
  <article>
    <h1>${a.title}</h1>
    ${htmlContent}
  </article>
</body>
</html>`
  }
}
