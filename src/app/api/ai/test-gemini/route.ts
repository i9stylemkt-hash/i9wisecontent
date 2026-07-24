import { generateText } from 'ai'
import { google } from '@ai-sdk/google'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const startTime = Date.now()

    const result = await generateText({
      model: google('gemini-2.0-flash'),
      prompt: 'Responda apenas com "OK - Gemini funcionando!" sem nada mais.',
      maxOutputTokens: 50,
    })

    const duration = Date.now() - startTime

    return NextResponse.json({
      status: 'ok',
      response: result.text,
      usage: result.usage,
      model: 'gemini-2.0-flash',
      latency_ms: duration,
      provider: 'google',
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        status: 'error',
        message,
        hint: 'Verifique se GOOGLE_GENERATIVE_AI_API_KEY está configurada no .env.local',
      },
      { status: 500 }
    )
  }
}
