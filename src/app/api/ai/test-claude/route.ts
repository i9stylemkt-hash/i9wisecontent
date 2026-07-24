import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const startTime = Date.now()

    const result = await generateText({
      model: anthropic('claude-3-5-haiku-20241022'),
      prompt: 'Responda apenas com "OK - Claude funcionando!" sem nada mais.',
      maxOutputTokens: 50,
    })

    const duration = Date.now() - startTime

    return NextResponse.json({
      status: 'ok',
      response: result.text,
      usage: result.usage,
      model: 'claude-3-5-haiku-20241022',
      latency_ms: duration,
      provider: 'anthropic',
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        status: 'error',
        message,
        hint: 'Verifique se ANTHROPIC_API_KEY está configurada no .env.local',
      },
      { status: 500 }
    )
  }
}
