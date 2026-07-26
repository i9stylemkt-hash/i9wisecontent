'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/hooks/use-sidebar'
import { mainNavItems } from '@/config/navigation'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { UserMenu } from './user-menu'

export function Sidebar() {
  const pathname = usePathname()
  const { isExpanded, toggle } = useSidebar()

  const mainItems = mainNavItems.slice(0, 6)
  const secondaryItems = mainNavItems.slice(6, 8)
  const settingsItems = mainNavItems.slice(8)

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 flex flex-col border-r border-border bg-card transition-all duration-200',
        isExpanded ? 'w-60' : 'w-16'
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center justify-between px-4">
        {isExpanded && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-md bg-primary" />
            <span className="text-sm font-semibold text-foreground">i9 Wise</span>
          </Link>
        )}
        {!isExpanded && (
          <Link href="/dashboard" className="mx-auto">
            <span className="block h-6 w-6 rounded-md bg-primary" />
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-7 w-7 shrink-0', !isExpanded && 'mx-auto')}
          onClick={toggle}
        >
          <ChevronLeft
            className={cn('h-4 w-4 transition-transform', !isExpanded && 'rotate-180')}
          />
        </Button>
      </div>

      <Separator />

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
        {mainItems.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            isActive={pathname.startsWith(item.href)}
            isExpanded={isExpanded}
          />
        ))}

        <Separator className="my-3" />

        {secondaryItems.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            isActive={pathname.startsWith(item.href)}
            isExpanded={isExpanded}
          />
        ))}
      </nav>

      {/* Bottom Navigation */}
      <div className="border-t border-border px-2 py-3 space-y-1">
        {settingsItems.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            isActive={pathname.startsWith(item.href)}
            isExpanded={isExpanded}
          />
        ))}
        <UserMenu isExpanded={isExpanded} />
      </div>
    </aside>
  )
}

function NavItem({
  item,
  isActive,
  isExpanded,
}: {
  item: (typeof mainNavItems)[number]
  isActive: boolean
  isExpanded: boolean
}) {
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      title={!isExpanded ? item.title : undefined}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-accent text-accent-foreground font-medium'
          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
        !isExpanded && 'justify-center px-2'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {isExpanded && <span className="truncate">{item.title}</span>}
    </Link>
  )
}
