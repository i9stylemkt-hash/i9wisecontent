import { DashboardShell } from '@/components/layout/dashboard-shell'
import { CommandPalette } from '@/components/layout/command-palette'
import { DashboardErrorBoundary } from '@/components/layout/dashboard-error-boundary'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DashboardShell>
        <DashboardErrorBoundary>{children}</DashboardErrorBoundary>
      </DashboardShell>
      <CommandPalette />
    </>
  )
}
