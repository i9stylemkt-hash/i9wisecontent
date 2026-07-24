import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">i9 Wise Content</CardTitle>
          <CardDescription>
            Plataforma de criação automatizada de conteúdo para blogs com agentes de IA
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-muted-foreground text-center text-sm">
            Setup concluído com sucesso. O ambiente está pronto para desenvolvimento.
          </p>
          <Button className="w-full">Começar</Button>
        </CardContent>
      </Card>
    </main>
  )
}
