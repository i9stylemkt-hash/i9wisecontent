import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Lightbulb,
  Calendar,
  Workflow,
  FileCode,
  MessageSquare,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  description?: string
  badge?: string
}

export const mainNavItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    description: 'Visão geral e métricas',
  },
  {
    title: 'Blogs',
    href: '/blogs',
    icon: BookOpen,
    description: 'Gerenciar blogs',
  },
  {
    title: 'Artigos',
    href: '/articles',
    icon: FileText,
    description: 'Kanban de artigos',
  },
  {
    title: 'Ideias',
    href: '/ideas',
    icon: Lightbulb,
    description: 'Banco de ideias',
  },
  {
    title: 'Calendário',
    href: '/calendar',
    icon: Calendar,
    description: 'Calendário editorial',
  },
  {
    title: 'Pipeline',
    href: '/pipeline',
    icon: Workflow,
    description: 'Pipeline de IA',
  },
  {
    title: 'Templates',
    href: '/templates',
    icon: FileCode,
    description: 'Templates de conteúdo',
  },
  {
    title: 'Prompts',
    href: '/prompts',
    icon: MessageSquare,
    description: 'Gerenciar prompts',
  },
  {
    title: 'Configurações',
    href: '/settings',
    icon: Settings,
    description: 'Configurações do app',
  },
]
