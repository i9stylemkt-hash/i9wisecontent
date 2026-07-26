import { PageHeader } from '@/components/shared/page-header'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, BookOpen } from 'lucide-react'
import Link from 'next/link'

export default function BlogsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Blogs" description="Gerencie seus blogs e configurações">
        <Link href="/blogs/new" className={buttonVariants()}>
          <Plus className="mr-2 h-4 w-4" />
          Criar Blog
        </Link>
      </PageHeader>

      {/* Empty State */}
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">Nenhum blog ainda</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Crie seu primeiro blog para começar a gerar conteúdo automaticamente.
          </p>
          <Link href="/blogs/new" className={buttonVariants({ className: 'mt-4' })}>
            <Plus className="mr-2 h-4 w-4" />
            Criar primeiro blog
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
