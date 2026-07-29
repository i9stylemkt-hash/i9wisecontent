// @vitest-environment node

/**
 * Unit Tests — Task 3.9
 * Pipeline Controller: execução completa, falha em agentes, retry, timeout
 *
 * Feature: audit-fixes-implementation
 * Validates: Requirements 2.1-2.6, 6.1-6.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock all dependencies
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/ai/agents/planner', () => ({
  PlannerAgent: {
    execute: vi.fn(),
  },
}))

vi.mock('@/lib/ai/agents/researcher', () => ({
  ResearcherAgent: {
    execute: vi.fn(),
  },
}))

vi.mock('@/lib/ai/agents/writer', () => ({
  WriterAgent: {
    execute: vi.fn(),
  },
}))

vi.mock('@/lib/ai/agents/reviewer', () => ({
  ReviewerAgent: {
    execute: vi.fn(),
  },
}))

import { PipelineController } from '@/lib/pipeline/controller'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { PlannerAgent } from '@/lib/ai/agents/planner'
import { ResearcherAgent } from '@/lib/ai/agents/researcher'
import { WriterAgent } from '@/lib/ai/agents/writer'
import { ReviewerAgent } from '@/lib/ai/agents/reviewer'

function createMockSupabase() {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  }
  return {
    from: vi.fn(() => mockQuery),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    _query: mockQuery,
  }
}

const mockBlog = {
  id: 'blog-1',
  user_id: 'user-1',
  name: 'Test Blog',
  niche: 'technology',
  tone_of_voice: 'professional',
  author_persona: 'tech expert',
  target_audience: 'developers',
  keywords: ['typescript', 'react'],
  content_language: 'pt-BR',
  quality_threshold: 7,
  automation_level: 'full_auto',
}

const mockPlanOutput = {
  title: 'Test Article',
  angle: 'practical guide',
  outline: ['intro', 'body', 'conclusion'],
  targetKeywords: ['typescript'],
  estimatedWordCount: 1500,
}

const mockResearchOutput = {
  briefing: 'Research findings',
  keyPoints: ['point 1'],
  references: ['ref 1'],
  dataPoints: ['data 1'],
}

const mockWriterOutput = {
  title: 'Test Article',
  content: '# Test\n\nContent here',
  metaDescription: 'A test article',
  summary: 'Summary of the article',
}

const mockReviewApproved = {
  overallScore: 8,
  scores: { grammar: 8, coherence: 8, toneAdherence: 8, seo: 8, originality: 8, readability: 8 },
  approved: true,
  feedback: 'Great article',
  suggestions: [],
}

const mockReviewRejected = {
  overallScore: 5,
  scores: { grammar: 5, coherence: 5, toneAdherence: 5, seo: 5, originality: 5, readability: 5 },
  approved: false,
  feedback: 'Needs improvement',
  suggestions: ['Be more specific', 'Add examples'],
}

describe('PipelineController — Unit Tests', () => {
  let mockSb: ReturnType<typeof createMockSupabase>

  beforeEach(() => {
    vi.clearAllMocks()
    mockSb = createMockSupabase()

    // Setup: supabase returns blog and run
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSb)

    // Blog lookup
    let callCount = 0
    mockSb._query.single.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // First call: insert pipeline run
        return Promise.resolve({ data: { id: 'run-1' }, error: null })
      }
      if (callCount === 2) {
        // Second call: fetch blog
        return Promise.resolve({ data: mockBlog, error: null })
      }
      // Subsequent calls: article insert
      return Promise.resolve({ data: { id: 'article-1' }, error: null })
    })

    // Agents
    ;(PlannerAgent.execute as ReturnType<typeof vi.fn>).mockResolvedValue(mockPlanOutput)
    ;(ResearcherAgent.execute as ReturnType<typeof vi.fn>).mockResolvedValue(mockResearchOutput)
    ;(WriterAgent.execute as ReturnType<typeof vi.fn>).mockResolvedValue(mockWriterOutput)
    ;(ReviewerAgent.execute as ReturnType<typeof vi.fn>).mockResolvedValue(mockReviewApproved)
  })

  it('executa pipeline completo com aprovação', async () => {
    const result = await PipelineController.execute({
      blogId: 'blog-1',
      userId: 'user-1',
    })

    expect(result.status).toBe('completed')
    expect(result.runId).toBe('run-1')
    expect(PlannerAgent.execute).toHaveBeenCalledOnce()
    expect(ResearcherAgent.execute).toHaveBeenCalledOnce()
    expect(WriterAgent.execute).toHaveBeenCalledOnce()
    expect(ReviewerAgent.execute).toHaveBeenCalledOnce()
  })

  it('marca como revision quando reviewer não aprova após max retries', async () => {
    ;(ReviewerAgent.execute as ReturnType<typeof vi.fn>).mockResolvedValue(mockReviewRejected)

    const result = await PipelineController.execute({
      blogId: 'blog-1',
      userId: 'user-1',
    })

    expect(result.status).toBe('revision')
    // Writer chamado 3 vezes: 1 original + 2 retries
    expect(WriterAgent.execute).toHaveBeenCalledTimes(3)
    // Reviewer chamado 3 vezes
    expect(ReviewerAgent.execute).toHaveBeenCalledTimes(3)
  })

  it('falha quando blog não é encontrado', async () => {
    let callCount = 0
    mockSb._query.single.mockImplementation(() => {
      callCount++
      if (callCount === 1) return Promise.resolve({ data: { id: 'run-1' }, error: null })
      return Promise.resolve({ data: null, error: { message: 'not found' } })
    })

    const result = await PipelineController.execute({
      blogId: 'invalid',
      userId: 'user-1',
    })

    expect(result.status).toBe('failed')
    expect(result.error).toContain('Blog não encontrado')
  })

  it('falha quando planner agent lança erro', async () => {
    ;(PlannerAgent.execute as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('AI provider error')
    )

    const result = await PipelineController.execute({
      blogId: 'blog-1',
      userId: 'user-1',
    })

    expect(result.status).toBe('failed')
    expect(result.error).toContain('AI provider error')
  })

  it('enqueue cria pipeline run com status queued', async () => {
    mockSb._query.single.mockResolvedValueOnce({ data: { id: 'run-new' }, error: null })

    const runId = await PipelineController.enqueue({
      blogId: 'blog-1',
      userId: 'user-1',
    })

    expect(runId).toBe('run-new')
    expect(mockSb.from).toHaveBeenCalledWith('pipeline_runs')
  })
})
