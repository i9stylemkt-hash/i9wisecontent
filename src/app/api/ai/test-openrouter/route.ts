import { generateText } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { NextResponse } from 'next/server'

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

export async function GET() {
  try {
    const startTime = Date.now()

    const result = await generateText({
      model: openrouter('meta-llama/llama-3.1-8b-instruct:free'),
      prompt: 'Responda apenas com "OK - OpenRouter funcionando!" sem nada mais.',
      maxOutputTokens: 50,
    })

    const duration = Date.now() - startTime

    return NextResponse.json({
      status: 'ok',
      response: result.text,
      usage: result.usage,
      model: 'meta-llama/llama-3.1-8b-instruct:free',
      latency_ms: duration,
      provider: 'openrouter',
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        status: 'error',
        message,
        hint: 'Verifique se OPENROUTER_API_KEY está configurada no .env.local',
      },
      { status: 500 }
    )
  }
}
