import { createServerSupabaseClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils'
import { Logger } from '@/lib/utils/logger'
import type { CreateBlogInput, UpdateBlogInput } from '@/lib/validations/blog'

const logger = new Logger('BlogService')

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

    // Tentar inserir com o schema completo (Drizzle)
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

    // Se falhar por colunas inexistentes, tentar com schema mínimo + settings JSONB
    if (error && (error.message?.includes('column') || error.code === '42703')) {
      logger.warn('Full schema insert failed, falling back to minimal schema', { errorMessage: error.message })
      const fallbackData = {
        user_id: userId,
        name: input.name,
        niche: input.niche,
        description: input.description ?? null,
        target_audience: input.targetAudience ?? null,
        tone: input.toneOfVoice ?? 'professional',
        language: input.contentLanguage ?? 'pt-BR',
        status: 'active',
        settings: {
          slug,
          authorPersona: input.authorPersona ?? null,
          keywords: input.keywords ?? [],
          publicationFrequency: input.publicationFrequency,
          automationLevel: input.automationLevel,
          contentTypes: input.contentTypes ?? null,
          qualityThreshold: input.qualityThreshold,
          humanReviewRequired: input.humanReviewRequired,
          seoConfig: input.seoConfig ?? null,
        },
      }

      const { data: fallbackResult, error: fallbackError } = await supabase
        .from('blogs')
        .insert(fallbackData)
        .select()
        .single()

      if (fallbackError) throw fallbackError
      return fallbackResult
    }

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

  static async clone(sourceBlogId: string, userId: string, newName: string) {
    const supabase = await createServerSupabaseClient()

    // Fetch source blog
    const source = await this.getById(sourceBlogId, userId)

    // Generate unique slug for the new blog
    const slug = await this.generateUniqueSlug(newName, userId)

    // Copy configuration fields
    const insertData = {
      user_id: userId,
      name: newName,
      slug,
      niche: (source as Record<string, unknown>).niche as string,
      tone_of_voice: (source as Record<string, unknown>).tone_of_voice as string | null,
      author_persona: (source as Record<string, unknown>).author_persona as string | null,
      target_audience: (source as Record<string, unknown>).target_audience as string | null,
      keywords: (source as Record<string, unknown>).keywords as string[] | null,
      content_language: (source as Record<string, unknown>).content_language as string,
      publication_frequency: (source as Record<string, unknown>).publication_frequency as string,
      automation_level: (source as Record<string, unknown>).automation_level as string,
      content_types: (source as Record<string, unknown>).content_types as unknown,
      quality_threshold: (source as Record<string, unknown>).quality_threshold as number,
      human_review_required: (source as Record<string, unknown>).human_review_required as boolean,
      seo_config: (source as Record<string, unknown>).seo_config as unknown,
    }

    const { data, error } = await supabase
      .from('blogs')
      .insert(insertData)
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
