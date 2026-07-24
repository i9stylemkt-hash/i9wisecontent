import { google } from '@ai-sdk/google'
import { anthropic } from '@ai-sdk/anthropic'
import { createGroq } from '@ai-sdk/groq'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'

// === PROVIDERS ===

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

// === MODELOS DISPONÍVEIS ===

export const geminiModels = {
  flash: google('gemini-2.0-flash'),
  pro: google('gemini-1.5-pro'),
  flashLite: google('gemini-2.0-flash-lite'),
} as const

export const claudeModels = {
  sonnet: anthropic('claude-sonnet-4-20250514'),
  haiku: anthropic('claude-3-5-haiku-20241022'),
} as const

export const groqModels = {
  llama70b: groq('llama-3.3-70b-versatile'),
  llama8b: groq('llama-3.1-8b-instant'),
  mixtral: groq('mixtral-8x7b-32768'),
} as const

export const openRouterModels = {
  deepseekChat: openrouter('deepseek/deepseek-chat'),
  llama31Free: openrouter('meta-llama/llama-3.1-8b-instruct:free'),
  gemmaFree: openrouter('google/gemma-2-9b-it:free'),
} as const

// === CONFIGURAÇÃO POR AGENTE ===

export const agentConfigs = {
  planner: {
    model: groqModels.llama70b,
    temperature: 0.7,
    maxOutputTokens: 2048,
    provider: 'groq' as const,
    description: 'Planejamento editorial rápido',
  },
  researcher: {
    model: geminiModels.flash,
    temperature: 0.3,
    maxOutputTokens: 4096,
    provider: 'google' as const,
    description: 'Pesquisa e análise de dados',
  },
  writer: {
    model: claudeModels.sonnet,
    temperature: 0.8,
    maxOutputTokens: 8192,
    provider: 'anthropic' as const,
    description: 'Escrita criativa de artigos longos',
  },
  reviewer: {
    model: claudeModels.haiku,
    temperature: 0.3,
    maxOutputTokens: 4096,
    provider: 'anthropic' as const,
    description: 'Revisão editorial e SEO',
  },
} as const

export type AgentConfigKey = keyof typeof agentConfigs
