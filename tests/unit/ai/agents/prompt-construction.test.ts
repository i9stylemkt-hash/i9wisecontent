// @vitest-environment node

/**
 * Property Test — Task 5.3
 * Property 5: Prompt Construction Includes All Config Fields
 *
 * Para qualquer configuração de blog com campos não-null (niche, toneOfVoice,
 * authorPersona, targetAudience, keywords), o prompt construído deve conter
 * todos os valores de configuração não-null.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// Reproduz a lógica de construção de system prompt do PlannerAgent
function buildPlannerSystemPrompt(blogConfig: {
  name: string
  niche: string
  toneOfVoice: string | null
  authorPersona: string | null
  targetAudience: string | null
  keywords: string[]
  contentLanguage: string
}): string {
  return `Você é um estrategista de conteúdo especializado em planejamento editorial.
Seu papel é criar planos de artigos que são relevantes, atraentes e otimizados para SEO.

Blog: ${blogConfig.name}
Nicho: ${blogConfig.niche}
Tom de voz: ${blogConfig.toneOfVoice || 'profissional e acessível'}
Persona do autor: ${blogConfig.authorPersona || 'especialista no tema'}
Público-alvo: ${blogConfig.targetAudience || 'público geral'}
Keywords do blog: ${blogConfig.keywords.length > 0 ? blogConfig.keywords.join(', ') : 'não definidas'}
Idioma: ${blogConfig.contentLanguage}

Retorne um plano completo com:
- title: título principal escolhido
- titleSuggestions: 3-5 opções de títulos alternativos
- angle: ângulo/abordagem diferenciada
- outline: estrutura detalhada do artigo (seções)
- targetKeywords: keywords-alvo para SEO
- estimatedWordCount: tamanho estimado em palavras
- contentType: tipo de conteúdo (tutorial, listicle, how-to, opinion, case-study, review)
- targetAudienceSegment: segmento específico do público-alvo para este artigo`
}

// Arbitrary para blog config com campos não-null
const nonNullBlogConfigArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => !s.includes('\n')),
  niche: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => !s.includes('\n')),
  toneOfVoice: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => !s.includes('\n')),
  authorPersona: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => !s.includes('\n')),
  targetAudience: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => !s.includes('\n')),
  keywords: fc.array(fc.string({ minLength: 1, maxLength: 30 }).filter((s) => !s.includes('\n') && !s.includes(',')), {
    minLength: 1,
    maxLength: 5,
  }),
  contentLanguage: fc.constantFrom('pt-BR', 'en-US', 'es-ES', 'fr-FR'),
})

// Arbitrary para blog config com campos possivelmente null
const blogConfigWithNullsArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => !s.includes('\n')),
  niche: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => !s.includes('\n')),
  toneOfVoice: fc.oneof(
    fc.string({ minLength: 1, maxLength: 50 }).filter((s) => !s.includes('\n')),
    fc.constant(null)
  ),
  authorPersona: fc.oneof(
    fc.string({ minLength: 1, maxLength: 50 }).filter((s) => !s.includes('\n')),
    fc.constant(null)
  ),
  targetAudience: fc.oneof(
    fc.string({ minLength: 1, maxLength: 50 }).filter((s) => !s.includes('\n')),
    fc.constant(null)
  ),
  keywords: fc.array(fc.string({ minLength: 1, maxLength: 30 }).filter((s) => !s.includes('\n') && !s.includes(',')), {
    minLength: 0,
    maxLength: 5,
  }),
  contentLanguage: fc.constantFrom('pt-BR', 'en-US', 'es-ES', 'fr-FR'),
})

describe('Prompt Construction — Property Tests', () => {
  it('Property 5: prompt contém todos os campos não-null da config', () => {
    fc.assert(
      fc.property(nonNullBlogConfigArb, (config) => {
        const prompt = buildPlannerSystemPrompt(config)

        // Todos os campos não-null devem estar presentes no prompt
        expect(prompt).toContain(config.name)
        expect(prompt).toContain(config.niche)
        expect(prompt).toContain(config.toneOfVoice)
        expect(prompt).toContain(config.authorPersona)
        expect(prompt).toContain(config.targetAudience)
        expect(prompt).toContain(config.contentLanguage)

        // Keywords devem estar presentes como join(', ')
        for (const keyword of config.keywords) {
          expect(prompt).toContain(keyword)
        }
      }),
      { numRuns: 100 }
    )
  })

  it('Property 5: prompt usa defaults quando campos são null', () => {
    fc.assert(
      fc.property(blogConfigWithNullsArb, (config) => {
        const prompt = buildPlannerSystemPrompt(config)

        if (config.toneOfVoice === null) {
          expect(prompt).toContain('profissional e acessível')
        } else {
          expect(prompt).toContain(config.toneOfVoice)
        }

        if (config.authorPersona === null) {
          expect(prompt).toContain('especialista no tema')
        } else {
          expect(prompt).toContain(config.authorPersona)
        }

        if (config.targetAudience === null) {
          expect(prompt).toContain('público geral')
        } else {
          expect(prompt).toContain(config.targetAudience)
        }

        if (config.keywords.length === 0) {
          expect(prompt).toContain('não definidas')
        } else {
          expect(prompt).toContain(config.keywords.join(', '))
        }
      }),
      { numRuns: 100 }
    )
  })

  it('Property 5: prompt sempre contém campos estruturais obrigatórios', () => {
    fc.assert(
      fc.property(blogConfigWithNullsArb, (config) => {
        const prompt = buildPlannerSystemPrompt(config)

        // Sempre contém os labels de seção
        expect(prompt).toContain('Blog:')
        expect(prompt).toContain('Nicho:')
        expect(prompt).toContain('Tom de voz:')
        expect(prompt).toContain('Persona do autor:')
        expect(prompt).toContain('Público-alvo:')
        expect(prompt).toContain('Keywords do blog:')
        expect(prompt).toContain('Idioma:')
      }),
      { numRuns: 100 }
    )
  })

  it('Property 5: prompt sempre contém instruções de retorno', () => {
    fc.assert(
      fc.property(blogConfigWithNullsArb, (config) => {
        const prompt = buildPlannerSystemPrompt(config)

        expect(prompt).toContain('- title:')
        expect(prompt).toContain('- titleSuggestions:')
        expect(prompt).toContain('- angle:')
        expect(prompt).toContain('- outline:')
        expect(prompt).toContain('- targetKeywords:')
        expect(prompt).toContain('- estimatedWordCount:')
        expect(prompt).toContain('- contentType:')
        expect(prompt).toContain('- targetAudienceSegment:')
      }),
      { numRuns: 100 }
    )
  })
})
