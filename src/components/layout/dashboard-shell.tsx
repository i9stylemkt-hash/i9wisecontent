'use client'

import { useSidebar } from '@/hooks/use-sidebar'
import { cn } from '@/lib/utils'
import { Sidebar } from './sidebar'
import { Header } from './header'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { isExpanded } = useSidebar()

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div
        className={cn(
          'flex flex-col transition-all duration-200',
          isExpanded ? 'pl-60' : 'pl-16'
        )}
      >
        <Header />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
