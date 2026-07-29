'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateBlogInput, UpdateBlogInput } from '@/lib/validations/blog'

async function fetchBlogs() {
  const res = await fetch('/api/blogs')
  if (!res.ok) throw new Error('Erro ao buscar blogs')
  return res.json()
}

async function fetchBlog(id: string) {
  const res = await fetch(`/api/blogs/${id}`)
  if (!res.ok) throw new Error('Blog não encontrado')
  return res.json()
}

async function createBlog(data: CreateBlogInput) {
  const res = await fetch('/api/blogs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    const details = error.details?.fieldErrors
    if (details) {
      // Build a readable message from field errors
      const fieldMessages = Object.entries(details)
        .filter(([, msgs]) => Array.isArray(msgs) && (msgs as string[]).length > 0)
        .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(', ')}`)
        .join('; ')
      throw new Error(fieldMessages || error.error || 'Erro ao criar blog')
    }
    throw new Error(error.error || 'Erro ao criar blog')
  }
  return res.json()
}

async function updateBlog({ id, data }: { id: string; data: UpdateBlogInput }) {
  const res = await fetch(`/api/blogs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Erro ao atualizar blog')
  return res.json()
}

async function deleteBlog(id: string) {
  const res = await fetch(`/api/blogs/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Erro ao excluir blog')
  return res.json()
}

export function useBlogs() {
  return useQuery({
    queryKey: ['blogs'],
    queryFn: fetchBlogs,
  })
}

export function useBlog(id: string) {
  return useQuery({
    queryKey: ['blogs', id],
    queryFn: () => fetchBlog(id),
    enabled: !!id,
  })
}

export function useCreateBlog() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createBlog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blogs'] })
    },
  })
}

export function useUpdateBlog() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateBlog,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['blogs'] })
      queryClient.invalidateQueries({ queryKey: ['blogs', variables.id] })
    },
  })
}

export function useDeleteBlog() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteBlog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blogs'] })
    },
  })
}
