import { createServerSupabaseClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils'
import type { CreateIdeaInput, UpdateIdeaInput } from '@/lib/validations/idea'

export class IdeaService {
  static async getAll(userId: string, blogId?: string) {
    const supabase = await createServerSupabaseClient()

    let query = supabase
      .from('ideas')
      .select('*, blogs!inner(user_id, name)')
      .eq('blogs.user_id', userId)
      .order('created_at', { ascending: false })

    if (blogId) {
      query = query.eq('blog_id', blogId)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  }

  static async getById(id: string, userId: string) {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from('ideas')
      .select('*, blogs!inner(user_id, name)')
      .eq('id', id)
      .eq('blogs.user_id', userId)
      .single()

    if (error) throw error
    return data
  }

  static async create(input: CreateIdeaInput, userId: string) {
    const supabase = await createServerSupabaseClient()

    // Verify blog ownership
    const { error: blogError } = await supabase
      .from('blogs')
      .select('id')
      .eq('id', input.blogId)
      .eq('user_id', userId)
      .single()

    if (blogError) throw new Error('Blog não encontrado')

    const { data, error } = await supabase
      .from('ideas')
      .insert({
        blog_id: input.blogId,
        title: input.title,
        description: input.description ?? null,
        references: input.references ?? [],
        priority: input.priority,
        status: input.status,
        tags: input.tags ?? [],
        source: input.source ?? null,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async update(id: string, input: UpdateIdeaInput, userId: string) {
    const supabase = await createServerSupabaseClient()

    // Verify ownership
    await this.getById(id, userId)

    const updateData: Record<string, unknown> = {}
    if (input.title !== undefined) updateData.title = input.title
    if (input.description !== undefined) updateData.description = input.description
    if (input.references !== undefined) updateData.references = input.references
    if (input.priority !== undefined) updateData.priority = input.priority
    if (input.status !== undefined) updateData.status = input.status
    if (input.tags !== undefined) updateData.tags = input.tags
    if (input.source !== undefined) updateData.source = input.source

    const { data, error } = await supabase
      .from('ideas')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async delete(id: string, userId: string) {
    const supabase = await createServerSupabaseClient()
    await this.getById(id, userId)

    const { error } = await supabase.from('ideas').delete().eq('id', id)
    if (error) throw error
  }

  static async convertToArticle(id: string, userId: string) {
    const supabase = await createServerSupabaseClient()
    const idea = await this.getById(id, userId)
    const i = idea as Record<string, unknown>

    // Create article from idea
    const { data: article, error } = await supabase
      .from('articles')
      .insert({
        blog_id: i.blog_id,
        title: i.title,
        slug: slugify(i.title as string),
        summary: i.description ?? null,
        tags: i.tags ?? [],
        status: 'planning',
      })
      .select()
      .single()

    if (error) throw error

    // Update idea status
    await supabase
      .from('ideas')
      .update({ status: 'in_progress' })
      .eq('id', id)

    return article
  }
}
