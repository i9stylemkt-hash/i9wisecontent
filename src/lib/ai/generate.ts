import { generateText, streamText } from 'ai'
import { agentConfigs, type AgentConfigKey } from './providers'

export async function generateContent(
  agentType: AgentConfigKey,
  prompt: string,
  systemPrompt?: string
) {
  const config = agentConfigs[agentType]

  const result = await generateText({
    model: config.model,
    temperature: config.temperature,
    maxOutputTokens: config.maxOutputTokens,
    system: systemPrompt,
    prompt,
  })

  return {
    text: result.text,
    usage: result.usage,
    finishReason: result.finishReason,
    provider: config.provider,
  }
}

export function streamContent(
  agentType: AgentConfigKey,
  prompt: string,
  systemPrompt?: string
) {
  const config = agentConfigs[agentType]

  return streamText({
    model: config.model,
    temperature: config.temperature,
    maxOutputTokens: config.maxOutputTokens,
    system: systemPrompt,
    prompt,
  })
}
