/**
 * LLM API client (LangChain backend)
 */

export type LLMRequest = {
  prompt: string
  mainTheme?: string
}

export type LLMResponse = {
  text: string
  summary: string
}

export type LLMError = {
  error: string
  details?: any
}

/**
 * Call LLM API and get response
 */
export async function callLLM(request: LLMRequest): Promise<LLMResponse> {
  const response = await fetch('/api/llm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request)
  })

  const data = await response.json()

  if (!response.ok) {
    throw new LLMAPIError(data.error || 'LLM API call failed', response.status, data.details)
  }

  return data
}

/**
 * LLM API error class
 */
export class LLMAPIError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: any
  ) {
    super(message)
    this.name = 'LLMAPIError'
  }
}

/**
 * Basic prompt validation
 */
export function validatePrompt(prompt: string): { isValid: boolean; error?: string } {
  if (!prompt || prompt.trim().length === 0) {
    return { isValid: false, error: 'Please enter a question' }
  }

  if (prompt.length > 3000) {
    return { isValid: false, error: 'Please enter question within 3000 characters' }
  }

  return { isValid: true }
}

/**
 * Helper type for managing LLM API state
 */
export type LLMState = {
  isLoading: boolean
  error: string | null
  lastResponse: LLMResponse | null
}

/**
 * Call LLM API with context and get response
 */
export async function callLLMWithContext(request: LLMRequest, context: string, mainTheme?: string): Promise<LLMResponse> {
  let promptWithContext = request.prompt

  promptWithContext = `${context}New question: ${request.prompt}`

  return callLLM({
    ...request,
    prompt: promptWithContext,
    mainTheme: mainTheme || ''
  })
}
