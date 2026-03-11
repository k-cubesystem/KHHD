import Anthropic from '@anthropic-ai/sdk'

const apiKey = process.env.ANTHROPIC_API_KEY || ''

let client: Anthropic | null = null

function getClient(): Anthropic {
  if (!client) {
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.')
    }
    client = new Anthropic({ apiKey })
  }
  return client
}

export interface ClaudeGenerateOptions {
  model: string
  systemPrompt?: string
  userPrompt: string
  maxTokens?: number
  temperature?: number
}

export async function generateWithClaude(options: ClaudeGenerateOptions): Promise<{
  text: string
  inputTokens: number
  outputTokens: number
}> {
  const anthropic = getClient()

  const response = await anthropic.messages.create({
    model: options.model,
    max_tokens: options.maxTokens || 8192,
    temperature: options.temperature ?? 0.7,
    system: options.systemPrompt || '',
    messages: [{ role: 'user', content: options.userPrompt }],
  })

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')

  return {
    text,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  }
}
