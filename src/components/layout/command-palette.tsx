'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import {
  BookOpen,
  FileText,
  Lightbulb,
  Settings,
  Workflow,
  Calendar,
  Plus,
  Search,
} from 'lucide-react'
import { useOverlay } from '@/hooks/use-overlay'

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { openOverlay, closeOverlay } = useOverlay()

  useEffect(() => {
    if (open) {
      openOverlay()
    }
    return () => {
      if (open) {
        closeOverlay()
      }
    }
  }, [open, openOverlay, closeOverlay])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  const navigate = useCallback((path: string) => {
    router.push(path)
    setOpen(false)
  }, [router])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Paleta de comandos"
    >
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <div className="fixed left-1/2 top-[20%] w-full max-w-lg -translate-x-1/2">
        <Command className="rounded-xl border border-border bg-popover shadow-xl">
          <div className="flex items-center gap-2 border-b border-border px-4">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
            <Command.Input
              placeholder="Buscar blogs, artigos, ações..."
              className="flex h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
          </div>
          <Command.List className="max-h-75 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              Nenhum resultado encontrado.
            </Command.Empty>

            <Command.Group heading="Navegação" className="text-xs text-muted-foreground px-2 py-1.5">
              <CommandItem icon={BookOpen} onSelect={() => navigate('/dashboard')}>
                Dashboard
              </CommandItem>
              <CommandItem icon={BookOpen} onSelect={() => navigate('/blogs')}>
                Blogs
              </CommandItem>
              <CommandItem icon={FileText} onSelect={() => navigate('/articles')}>
                Artigos
              </CommandItem>
              <CommandItem icon={Lightbulb} onSelect={() => navigate('/ideas')}>
                Banco de Ideias
              </CommandItem>
              <CommandItem icon={Calendar} onSelect={() => navigate('/calendar')}>
                Calendário
              </CommandItem>
              <CommandItem icon={Workflow} onSelect={() => navigate('/pipeline')}>
                Pipeline
              </CommandItem>
              <CommandItem icon={Settings} onSelect={() => navigate('/settings')}>
                Configurações
              </CommandItem>
            </Command.Group>

            <Command.Separator className="my-2 h-px bg-border" />

            <Command.Group heading="Ações Rápidas" className="text-xs text-muted-foreground px-2 py-1.5">
              <CommandItem icon={Plus} onSelect={() => navigate('/blogs/new')}>
                Criar novo blog
              </CommandItem>
              <CommandItem icon={Workflow} onSelect={() => navigate('/settings/ai-models')}>
                Configurar modelos de IA
              </CommandItem>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  )
}

function CommandItem({
  children,
  icon: Icon,
  onSelect,
}: {
  children: React.ReactNode
  icon: React.ComponentType<{ className?: string }>
  onSelect: () => void
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent data-[selected=true]:bg-accent"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      {children}
    </Command.Item>
  )
}
