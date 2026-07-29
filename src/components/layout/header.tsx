'use client'

import { usePathname } from 'next/navigation'
import { Search, Bell, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSidebar } from '@/hooks/use-sidebar'

export function Header() {
  const pathname = usePathname()
  useSidebar() // hook required for reactivity

  const breadcrumbs = generateBreadcrumbs(pathname)

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur supports-backdrop-filter:bg-background/60">
      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 lg:hidden"
          onClick={() => useSidebar.getState().toggle()}
        >
          <Menu className="h-4 w-4" />
        </Button>
        <nav className="flex items-center text-sm text-muted-foreground">
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb.path} className="flex items-center">
              {index > 0 && <span className="mx-2">/</span>}
              <span
                className={
                  index === breadcrumbs.length - 1
                    ? 'font-medium text-foreground'
                    : 'hover:text-foreground'
                }
              >
                {crumb.label}
              </span>
            </span>
          ))}
        </nav>
      </div>

      {/* Center: Search */}
      <div className="hidden md:flex">
        <Button
          variant="outline"
          className="h-8 w-64 justify-start gap-2 text-xs text-muted-foreground"
        >
          <Search className="h-3.5 w-3.5" />
          <span>⌘K Buscar...</span>
        </Button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}

function generateBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs: { label: string; path: string }[] = []

  const labelMap: Record<string, string> = {
    dashboard: 'Dashboard',
    blogs: 'Blogs',
    articles: 'Artigos',
    pipeline: 'Pipeline',
    ideas: 'Ideias',
    calendar: 'Calendário',
    templates: 'Templates',
    prompts: 'Prompts',
    settings: 'Configurações',
    new: 'Novo',
  }

  let currentPath = ''
  for (const segment of segments) {
    currentPath += `/${segment}`
    breadcrumbs.push({
      label: labelMap[segment] || segment,
      path: currentPath,
    })
  }

  return breadcrumbs
}
