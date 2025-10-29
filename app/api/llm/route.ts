import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ChatAnthropic } from '@langchain/anthropic'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { StructuredOutputParser } from '@langchain/core/output_parsers'

// Request/Response schema definition
const RequestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  mainTheme: z.string().optional().default('')
})

const ResponseSchema = z.object({
  text: z.string().describe("Detailed markdown-formatted response within 3000 characters"),
  summary: z.string().describe("Concise summary within 300 characters"),
})

// Zod schema for structured output
const FullClaudeResponseSchema = z.object({
  text: z.string().describe("Detailed response within 3000 characters"),
  summary: z.string().describe("Concise summary within 300 characters"),
  nextStudy: z.string().describe("Next research proposal within 500 characters")
})

// Initialize Claude configuration for LangChain
function initializeClaude() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  const model = process.env.LLM_MODEL || 'claude-3-5-haiku-20241022'

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set')
  }

  return new ChatAnthropic({
    anthropicApiKey: apiKey,
    modelName: model,
    maxTokens: 6000,
    temperature: 0.5,
  })
}

export async function POST(req: NextRequest) {
  try {
    // Validate request body
    const body = await req.json()
    const { prompt, mainTheme } = RequestSchema.parse(body)

    // Mock mode
    if (process.env.MOCK_LLM === '1') {
      const mockResponse = getMockResponse(prompt)
      const mockSummary = mockResponse.slice(0, 100) + '...'
      return NextResponse.json(ResponseSchema.parse({ text: mockResponse, summary: mockSummary }))
    }

    // Generate both full text and summary with Claude
    const claudeResponse = await tryClaudeApiWithSummary(prompt, mainTheme)
    if (claudeResponse) {
      return NextResponse.json(ResponseSchema.parse(claudeResponse))
    }

    // Fallback if API fails
    throw new Error('LLM API failed')

  } catch (error) {
    console.error('LLM API Error:', error)

    // Zod error case
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format', details: error.errors },
        { status: 400 }
      )
    }

    // Other errors - network errors, etc.
    const fallbackText = 'Service is temporarily unavailable. Please try again later.'
    const fallbackSummary = 'Service temporarily down'

    return NextResponse.json(
      ResponseSchema.parse({ text: fallbackText, summary: fallbackSummary })
    )
  }
}

/**
 * Generate full text, summary, and next research content simultaneously with Claude
 */
async function tryClaudeApiWithSummary(prompt: string, mainTheme: string): Promise<{ text: string; summary: string; } | null> {
  const claude = initializeClaude()

  // Configure OutputParser
  const parser = StructuredOutputParser.fromZodSchema(FullClaudeResponseSchema)

  const systemPrompt = `
# Your Role
You are an AI assistant supporting brainstorming in a whiteboard application.
Please answer user questions concisely and clearly.

# Main Theme
${mainTheme}

# Response Guidelines
- Respond in detail within 3000 characters
- Organize clearly in markdown format (use headings, bullet points, bold text, etc.)
- Include specific examples in explanations
- Provide diagrams or structured information as needed
- Suggest next steps or related research topics

# Output Format
- text: Detailed markdown-formatted response within 3000 characters
- summary: Concise summary within 300 characters
- nextStudy: Next research proposal within 500 characters
`

  const userPrompt = createClaudePromptWithSummary(prompt, parser)

  const messages = [
    new SystemMessage(systemPrompt),
    new HumanMessage(userPrompt)
  ]

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Claude request timeout')), 30000)
    })

    const responsePromise = claude.invoke(messages)
    const response = await Promise.race([responsePromise, timeoutPromise])

    if (response && response.content) {
      const responseText = typeof response.content === 'string'
        ? response.content
        : response.content.toString()

      // StructuredOutputParserでパース
      const parsed = await parser.parse(responseText)

      return {
        text: parsed.text + "\n\n" + parsed.nextStudy,
        summary: parsed.summary + "\n\n" + parsed.nextStudy
      }
    }

    return null
  } catch (error) {
    console.error('Claude API error:', error)
    return null
  }
}

function createClaudePromptWithSummary(userPrompt: string, parser: any): string {
  return `
# User Input
${userPrompt}

# Output Format
${parser.getFormatInstructions()}`
}

/**
 * Generate mock response
 */
function getMockResponse(prompt: string): string {
  // Simple mock response based on prompt keywords
  const lowerPrompt = prompt.toLowerCase()

  // Japanese keyword mock responses
  if (lowerPrompt.includes('アイデア') || lowerPrompt.includes('企画')) {
    return '1) Understanding user needs 2) Defining core features 3) Creating a simple prototype'
  }
  if (lowerPrompt.includes('問題') || lowerPrompt.includes('課題')) {
    return 'Key points for organization: 1) Root cause 2) Immediate countermeasures 3) Long-term solutions'
  }
  if (lowerPrompt.includes('整理') || lowerPrompt.includes('まとめ')) {
    return 'Organizing into 3 key points: 1) Background & current situation 2) Issues & problems 3) Next actions'
  }

  return 'Points to consider: 1) Current situation 2) Desired outcome 3) Specific next steps'
}
