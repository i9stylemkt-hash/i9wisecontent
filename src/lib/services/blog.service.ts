import { createServerSupabaseClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils'
import type { CreateBlogInput, UpdateBlogInput } from '@/lib/validations/blog'

export class BlogService {
  static async getAll(userId: string) {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from('blogs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  static async getById(id: string, userId: string) {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from('blogs')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error) throw error
    return data
  }

  static async create(input: CreateBlogInput, userId: string) {
    const supabase = await createServerSupabaseClient()

    const slug = await this.generateUniqueSlug(input.name, userId)

    const insertData = {
      user_id: userId,
      name: input.name,
      slug,
      niche: input.niche,
      description: input.description ?? null,
      tone_of_voice: input.toneOfVoice ?? null,
      author_persona: input.authorPersona ?? null,
      target_audience: input.targetAudience ?? null,
      keywords: input.keywords ?? [],
      content_language: input.contentLanguage,
      publication_frequency: input.publicationFrequency,
      automation_level: input.automationLevel,
      content_types: input.contentTypes ?? null,
      quality_threshold: input.qualityThreshold,
      human_review_required: input.humanReviewRequired,
      seo_config: input.seoConfig ?? null,
    }

    const { data, error } = await supabase
      .from('blogs')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async update(id: string, input: UpdateBlogInput, userId: string) {
    const supabase = await createServerSupabaseClient()

    const updateData: Record<string, unknown> = {}
    if (input.name !== undefined) updateData.name = input.name
    if (input.niche !== undefined) updateData.niche = input.niche
    if (input.description !== undefined) updateData.description = input.description
    if (input.toneOfVoice !== undefined) updateData.tone_of_voice = input.toneOfVoice
    if (input.authorPersona !== undefined) updateData.author_persona = input.authorPersona
    if (input.targetAudience !== undefined) updateData.target_audience = input.targetAudience
    if (input.keywords !== undefined) updateData.keywords = input.keywords
    if (input.contentLanguage !== undefined) updateData.content_language = input.contentLanguage
    if (input.publicationFrequency !== undefined) updateData.publication_frequency = input.publicationFrequency
    if (input.automationLevel !== undefined) updateData.automation_level = input.automationLevel
    if (input.contentTypes !== undefined) updateData.content_types = input.contentTypes
    if (input.qualityThreshold !== undefined) updateData.quality_threshold = input.qualityThreshold
    if (input.humanReviewRequired !== undefined) updateData.human_review_required = input.humanReviewRequired
    if (input.seoConfig !== undefined) updateData.seo_config = input.seoConfig

    const { data, error } = await supabase
      .from('blogs')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async delete(id: string, userId: string) {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase
      .from('blogs')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error
  }

  static async toggleActive(id: string, userId: string) {
    const supabase = await createServerSupabaseClient()

    const blog = await this.getById(id, userId)
    const isActive = (blog as { is_active?: boolean }).is_active
    const { data, error } = await supabase
      .from('blogs')
      .update({ is_active: !isActive })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  private static async generateUniqueSlug(name: string, userId: string): Promise<string> {
    const supabase = await createServerSupabaseClient()
    let slug = slugify(name)

    const { data } = await supabase
      .from('blogs')
      .select('slug')
      .eq('user_id', userId)
      .like('slug', `${slug}%`)

    if (data && data.length > 0) {
      slug = `${slug}-${data.length + 1}`
    }

    return slug
  }
}
