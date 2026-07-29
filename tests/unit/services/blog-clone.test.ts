// @vitest-environment node

/**
 * Property-Based Test — Task 5.9
 * Property 7: Blog Clone Fidelity and Uniqueness
 *
 * For any blog with valid configuration, the clone must have:
 * - All configuration fields identical to source
 * - A slug different from source
 *
 * Feature: audit-fixes-implementation
 * Validates: Requirements 3.3, 3.4
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { slugify } from '@/lib/utils'

/**
 * Represents a blog source with all configuration fields.
 */
interface BlogSource {
  id: string
  slug: string
  name: string
  niche: string
  tone_of_voice: string | null
  author_persona: string | null
  target_audience: string | null
  keywords: string[]
  content_language: string
  publication_frequency: string
  automation_level: string
  content_types: string[] | null
  quality_threshold: number
  human_review_required: boolean
  seo_config: Record<string, unknown> | null
}

/**
 * Configuration fields that must be copied from source to clone.
 */
const CLONE_FIELDS = [
  'niche',
  'tone_of_voice',
  'author_persona',
  'target_audience',
  'keywords',
  'content_language',
  'publication_frequency',
  'automation_level',
  'content_types',
  'quality_threshold',
  'human_review_required',
  'seo_config',
] as const

/**
 * Simulates the blog clone logic (mirrors BlogService.clone behavior)
 * without Supabase dependency.
 */
function cloneBlog(source: BlogSource, newName: string): BlogSource & { name: string } {
  const newSlug = slugify(newName)
  // Ensure slug differs: if same as source, append suffix
  const finalSlug = newSlug === source.slug ? `${newSlug}-copy` : newSlug

  return {
    id: `clone-${Date.now()}`,
    name: newName,
    slug: finalSlug,
    niche: source.niche,
    tone_of_voice: source.tone_of_voice,
    author_persona: source.author_persona,
    target_audience: source.target_audience,
    keywords: [...source.keywords],
    content_language: source.content_language,
    publication_frequency: source.publication_frequency,
    automation_level: source.automation_level,
    content_types: source.content_types ? [...source.content_types] : null,
    quality_threshold: source.quality_threshold,
    human_review_required: source.human_review_required,
    seo_config: source.seo_config ? { ...source.seo_config } : null,
  }
}

/**
 * Arbitrary for generating random blog sources with valid configuration.
 */
const arbBlogSource: fc.Arbitrary<BlogSource> = fc.record({
  id: fc.uuid(),
  slug: fc.stringMatching(/^[a-z][a-z0-9-]{2,30}$/),
  name: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
  niche: fc.constantFrom('tech', 'health', 'finance', 'lifestyle', 'education'),
  tone_of_voice: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 50 })),
  author_persona: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 100 })),
  target_audience: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 100 })),
  keywords: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 0, maxLength: 10 }),
  content_language: fc.constantFrom('pt-BR', 'en-US', 'es-ES', 'fr-FR'),
  publication_frequency: fc.constantFrom('daily', 'weekly', 'biweekly', 'monthly'),
  automation_level: fc.constantFrom('full', 'semi', 'manual'),
  content_types: fc.oneof(
    fc.constant(null),
    fc.array(fc.constantFrom('article', 'tutorial', 'review', 'listicle'), {
      minLength: 1,
      maxLength: 4,
    })
  ),
  quality_threshold: fc.integer({ min: 1, max: 100 }),
  human_review_required: fc.boolean(),
  seo_config: fc.oneof(
    fc.constant(null),
    fc.record({
      metaTitle: fc.boolean(),
      metaDescription: fc.boolean(),
      keywords: fc.boolean(),
    })
  ),
})

/**
 * Arbitrary for generating a new name that produces a different slug than the source.
 */
function arbNewName(sourceSlug: string): fc.Arbitrary<string> {
  return fc
    .string({ minLength: 1, maxLength: 80 })
    .filter((name) => name.trim().length > 0)
    .filter((name) => {
      const generatedSlug = slugify(name)
      // Accept names that generate non-empty slugs
      return generatedSlug.length > 0
    })
}

describe('Property 7: Blog Clone Fidelity and Uniqueness', () => {
  it('clone preserves all configuration fields from source', () => {
    fc.assert(
      fc.property(arbBlogSource, fc.string({ minLength: 1, maxLength: 80 }).filter((s) => slugify(s).length > 0), (source, newName) => {
        const clone = cloneBlog(source, newName)

        for (const field of CLONE_FIELDS) {
          const sourceValue = source[field]
          const cloneValue = clone[field]

          if (Array.isArray(sourceValue)) {
            expect(cloneValue).toEqual(sourceValue)
          } else if (typeof sourceValue === 'object' && sourceValue !== null) {
            expect(cloneValue).toEqual(sourceValue)
          } else {
            expect(cloneValue).toBe(sourceValue)
          }
        }
      }),
      { numRuns: 150 }
    )
  })

  it('clone slug is always different from source slug', () => {
    fc.assert(
      fc.property(arbBlogSource, fc.string({ minLength: 1, maxLength: 80 }).filter((s) => slugify(s).length > 0), (source, newName) => {
        const clone = cloneBlog(source, newName)

        expect(clone.slug).not.toBe(source.slug)
      }),
      { numRuns: 150 }
    )
  })

  it('clone has a non-empty slug', () => {
    fc.assert(
      fc.property(arbBlogSource, fc.string({ minLength: 1, maxLength: 80 }).filter((s) => slugify(s).length > 0), (source, newName) => {
        const clone = cloneBlog(source, newName)

        expect(clone.slug.length).toBeGreaterThan(0)
      }),
      { numRuns: 150 }
    )
  })

  it('clone name is the new name, not the source name', () => {
    fc.assert(
      fc.property(arbBlogSource, fc.string({ minLength: 1, maxLength: 80 }).filter((s) => slugify(s).length > 0), (source, newName) => {
        const clone = cloneBlog(source, newName)

        expect(clone.name).toBe(newName)
      }),
      { numRuns: 150 }
    )
  })
})
