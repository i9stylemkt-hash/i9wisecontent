'use client'

import { BlogCard, type BlogCardProps } from '@/components/blog/BlogCard'

export interface BlogGridProps {
  blogs: BlogCardProps[]
  onBlogClick?: (id: string) => void
}

export function BlogGrid({ blogs, onBlogClick }: BlogGridProps) {
  if (blogs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <p className="text-sm text-muted-foreground">Nenhum blog encontrado</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {blogs.map((blog) => (
        <BlogCard key={blog.id} {...blog} onClick={onBlogClick} />
      ))}
    </div>
  )
}
