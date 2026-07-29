'use client'

import type { ReactNode } from 'react'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

interface ErrorBoundaryWrapperProps {
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Client-side wrapper for ErrorBoundary, suitable for use in layouts.
 * Since Error Boundaries must be class components and layouts may be
 * server components, this wrapper bridges the gap.
 */
export function ErrorBoundaryWrapper({ children, fallback }: ErrorBoundaryWrapperProps) {
  return <ErrorBoundary fallback={fallback}>{children}</ErrorBoundary>
}

export default ErrorBoundaryWrapper
