import { generateWithFallback } from '@/lib/ai/fallback'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const result = await generateWithFallback(
      'Liste 3 ideias de títulos para um artigo sobre produtividade. Responda em português BR.',
      {
        system: 'Você é um editor de blog especialista em conteúdo.',
        temperature: 0.7,
        maxOutputTokens: 500,
      }
    )

    return NextResponse.json({
      status: 'ok',
      response: result.text,
      provider_used: result.provider,
      fallback_activated: result.fallbackUsed,
      usage: result.usage,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        status: 'error',
        message,
      },
      { status: 500 }
    )
  }
}
