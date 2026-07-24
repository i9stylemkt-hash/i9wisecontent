import { generateText } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { NextResponse } from 'next/server'

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function GET() {
  try {
    const startTime = Date.now()

    const result = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      prompt: 'Responda apenas com "OK - Groq funcionando!" sem nada mais.',
      maxOutputTokens: 50,
    })

    const duration = Date.now() - startTime

    return NextResponse.json({
      status: 'ok',
      response: result.text,
      usage: result.usage,
      model: 'llama-3.3-70b-versatile',
      latency_ms: duration,
      provider: 'groq',
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        status: 'error',
        message,
        hint: 'Verifique se GROQ_API_KEY está configurada no .env.local',
      },
      { status: 500 }
    )
  }
}
