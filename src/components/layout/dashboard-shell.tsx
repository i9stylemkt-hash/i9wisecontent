'use client'

import { useSidebar } from '@/hooks/use-sidebar'
import { useOverlay } from '@/hooks/use-overlay'
import { cn } from '@/lib/utils'
import { Sidebar } from './sidebar'
import { Header } from './header'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { isExpanded } = useSidebar()
  const activeOverlays = useOverlay((s) => s.activeOverlays)
  const hasOverlay = activeOverlays > 0

  return (
    <div
      className="min-h-screen bg-background"
      id="dashboard-shell"
      // Quando há um overlay ativo (modal, command palette), o conteúdo
      // principal fica inert — removido do foco E da árvore de acessibilidade
      // simultaneamente, evitando o erro aria-hidden-focus.
      {...(hasOverlay ? { inert: true } : {})}
    >
      <Sidebar />
      <div
        className={cn(
          'flex flex-col transition-all duration-200',
          isExpanded ? 'pl-60' : 'pl-16'
        )}
      >
        <Header />
        <main className="flex-1 p-6" role="main" aria-label="Conteúdo principal">
          {children}
        </main>
      </div>
    </div>
  )
}
