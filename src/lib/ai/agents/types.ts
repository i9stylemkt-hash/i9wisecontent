export interface AgentInput {
  blogConfig: {
    name: string
    niche: string
    toneOfVoice: string | null
    authorPersona: string | null
    targetAudience: string | null
    keywords: string[]
    contentLanguage: string
  }
  context?: Record<string, unknown>
}

export interface PlannerInput extends AgentInput {
  existingTopics?: string[]
  ideaTitle?: string
}

export interface ResearcherInput extends AgentInput {
  topic: string
  angle?: string
}

export interface WriterInput extends AgentInput {
  topic: string
  briefing: string
  template?: string
  targetWordCount?: number
}

export interface ReviewerInput extends AgentInput {
  article: {
    title: string
    content: string
  }
  qualityThreshold: number
}

export interface PlannerOutput {
  title: string
  angle: string
  outline: string[]
  targetKeywords: string[]
  estimatedWordCount: number
  titleSuggestions: string[]
  contentType: string
  targetAudienceSegment: string
}

export interface ResearcherOutput {
  briefing: string
  keyPoints: string[]
  references: string[]
  dataPoints: string[]
  statistics: string[]
  competitorInsights: string[]
  enrichedOutline: string[]
}

export interface WriterOutput {
  title: string
  content: string
  metaDescription: string
  summary: string
}

export interface ReviewerOutput {
  overallScore: number
  scores: {
    grammar: number
    coherence: number
    toneAdherence: number
    seo: number
    originality: number
    readability: number
  }
  approved: boolean
  feedback: string
  suggestions: string[]
}
