/**
 * Prompt Sanitizer — protects AI prompt construction from injection attacks.
 *
 * Removes known injection patterns, escapes special characters,
 * and enforces length limits on user-supplied fields.
 */

export interface SanitizeOptions {
  maxLength: number
  placeholder?: string
}

export const FIELD_LIMITS = {
  title: 200,
  keywords: 500,
  description: 1000,
  persona: 500,
  default: 2000,
} as const

/**
 * Patterns known to be used for prompt injection.
 */
const INJECTION_PATTERNS: RegExp[] = [
  // Triple backticks containing "system" or "instructions"
  /```[\s\S]*?(system|instruction)[\s\S]*?```/gi,
  // XML-style tags
  /<system>[\s\S]*?<\/system>/gi,
  /<instructions>[\s\S]*?<\/instructions>/gi,
  // ChatML markers
  /<\|im_start\|>[\s\S]*?(<\|im_end\|>|$)/gi,
  // Common social engineering strings
  /ignore\s+previous\s+instructions/gi,
  /you\s+are\s+now/gi,
  /disregard\s+above/gi,
]

export class PromptSanitizer {
  /**
   * Sanitize user input for safe inclusion in AI prompts.
   *
   * 1. Removes injection patterns
   * 2. Escapes remaining special characters
   * 3. Truncates to maxLength without breaking words
   * 4. Returns placeholder if result is empty
   */
  static sanitize(input: string, options: SanitizeOptions): string {
    if (!input || input.trim().length === 0) {
      return options.placeholder ?? 'conteúdo não fornecido'
    }

    let result = input

    // Step 1: Remove injection patterns
    result = this.removeInjectionPatterns(result)

    // Step 2: Escape special characters
    result = this.escapeSpecialChars(result)

    // Step 3: Trim whitespace
    result = result.trim()

    // Step 4: Truncate to maxLength
    result = this.truncate(result, options.maxLength)

    // Step 5: If empty after sanitization, return placeholder
    if (result.trim().length === 0) {
      return options.placeholder ?? 'conteúdo não fornecido'
    }

    return result
  }

  /**
   * Remove known prompt injection patterns from input.
   */
  private static removeInjectionPatterns(input: string): string {
    let result = input

    for (const pattern of INJECTION_PATTERNS) {
      // Reset regex lastIndex for global patterns
      pattern.lastIndex = 0
      result = result.replace(pattern, '')
    }

    return result
  }

  /**
   * Escape special characters that could interfere with prompt formatting.
   * Replaces isolated backticks (not triple) with escaped version.
   */
  private static escapeSpecialChars(input: string): string {
    // Escape isolated backticks (single or double, but not triple which was already handled)
    return input.replace(/(?<!`)(`{1,2})(?!`)/g, '\\$1')
  }

  /**
   * Truncate string to maxLength without breaking words.
   * Finds the last space before maxLength and cuts there.
   */
  private static truncate(input: string, maxLength: number): string {
    if (input.length <= maxLength) {
      return input
    }

    // Find the last space within maxLength
    const truncated = input.slice(0, maxLength)
    const lastSpace = truncated.lastIndexOf(' ')

    if (lastSpace > 0) {
      return truncated.slice(0, lastSpace)
    }

    // No space found: hard cut at maxLength
    return truncated
  }
}
