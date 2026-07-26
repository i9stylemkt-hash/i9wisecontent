import { DashboardShell } from '@/components/layout/dashboard-shell'
import { CommandPalette } from '@/components/layout/command-palette'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DashboardShell>{children}</DashboardShell>
      <CommandPalette />
    </>
  )
}
