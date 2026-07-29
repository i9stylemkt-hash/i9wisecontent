'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateArticleInput, UpdateArticleInput } from '@/lib/validations/article'

async function fetchArticles(blogId?: string) {
  const params = blogId ? `?blog_id=${blogId}` : ''
  const res = await fetch(`/api/articles${params}`)
  if (!res.ok) throw new Error('Erro ao buscar artigos')
  const json = await res.json()
  // API returns paginated result { data: [], meta: {} } — extract the array
  return Array.isArray(json) ? json : (json.data ?? [])
}

async function fetchArticle(id: string) {
  const res = await fetch(`/api/articles/${id}`)
  if (!res.ok) throw new Error('Artigo não encontrado')
  return res.json()
}

async function createArticle(data: CreateArticleInput) {
  const res = await fetch('/api/articles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Erro ao criar artigo')
  }
  return res.json()
}

async function updateArticle({ id, data }: { id: string; data: UpdateArticleInput }) {
  const res = await fetch(`/api/articles/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Erro ao atualizar artigo')
  }
  return res.json()
}

async function deleteArticle(id: string) {
  const res = await fetch(`/api/articles/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Erro ao excluir artigo')
}

export function useArticles(blogId?: string) {
  return useQuery({
    queryKey: ['articles', blogId],
    queryFn: () => fetchArticles(blogId),
  })
}

export function useArticle(id: string) {
  return useQuery({
    queryKey: ['articles', 'detail', id],
    queryFn: () => fetchArticle(id),
    enabled: !!id,
  })
}

export function useCreateArticle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createArticle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] })
    },
  })
}

export function useUpdateArticle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateArticle,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['articles'] })
      queryClient.invalidateQueries({ queryKey: ['articles', 'detail', variables.id] })
    },
  })
}

export function useDeleteArticle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteArticle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] })
    },
  })
}
