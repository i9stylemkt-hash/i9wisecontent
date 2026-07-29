// @vitest-environment node

/**
 * Unit Tests — Task 3.9
 * Blog Service: CRUD, geração de slug, toggle status
 *
 * Feature: audit-fixes-implementation
 * Validates: Requirements 3.1-3.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { BlogService } from '@/lib/services/blog.service'
import { createServerSupabaseClient } from '@/lib/supabase/server'

function createMockSupabase() {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn(),
  }
  return {
    from: vi.fn(() => mockQuery),
    _query: mockQuery,
  }
}

describe('BlogService — Unit Tests', () => {
  let mockSb: ReturnType<typeof createMockSupabase>

  beforeEach(() => {
    vi.clearAllMocks()
    mockSb = createMockSupabase()
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSb)
  })

  describe('getAll', () => {
    it('retorna lista de blogs do usuário', async () => {
      const mockBlogs = [
        { id: '1', name: 'Blog 1' },
        { id: '2', name: 'Blog 2' },
      ]
      mockSb._query.order.mockReturnValue({
        data: mockBlogs,
        error: null,
      })

      const blogs = await BlogService.getAll('user-1')

      expect(blogs).toEqual(mockBlogs)
      expect(mockSb.from).toHaveBeenCalledWith('blogs')
      expect(mockSb._query.eq).toHaveBeenCalledWith('user_id', 'user-1')
    })

    it('lança erro quando query falha', async () => {
      mockSb._query.order.mockReturnValue({
        data: null,
        error: { message: 'Query failed' },
      })

      await expect(BlogService.getAll('user-1')).rejects.toThrow()
    })
  })

  describe('getById', () => {
    it('retorna blog específico', async () => {
      const mockBlog = { id: 'blog-1', name: 'Test Blog' }
      mockSb._query.single.mockResolvedValue({ data: mockBlog, error: null })

      const blog = await BlogService.getById('blog-1', 'user-1')

      expect(blog).toEqual(mockBlog)
    })
  })

  describe('delete', () => {
    it('deleta blog com sucesso', async () => {
      // delete().eq().eq() chain
      mockSb._query.eq.mockReturnValue({ eq: vi.fn().mockReturnValue({ error: null }) })

      await expect(BlogService.delete('blog-1', 'user-1')).resolves.not.toThrow()
      expect(mockSb.from).toHaveBeenCalledWith('blogs')
    })
  })

  describe('toggleActive', () => {
    it('inverte status ativo do blog', async () => {
      // getById call
      mockSb._query.single
        .mockResolvedValueOnce({ data: { id: 'blog-1', is_active: true }, error: null })
        // update call
        .mockResolvedValueOnce({ data: { id: 'blog-1', is_active: false }, error: null })

      const result = await BlogService.toggleActive('blog-1', 'user-1')
      expect(result).toEqual({ id: 'blog-1', is_active: false })
    })
  })
})
