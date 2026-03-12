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

export interface ImagePart {
  mimeType: string
  data: string // base64
}

export interface ClaudeGenerateOptions {
  model: string
  systemPrompt?: string
  userPrompt: string
  maxTokens?: number
  temperature?: number
  images?: ImagePart[]
}

export async function generateWithClaude(options: ClaudeGenerateOptions): Promise<{
  text: string
  inputTokens: number
  outputTokens: number
}> {
  const anthropic = getClient()

  // 멀티모달: 이미지 + 텍스트 조합
  const contentParts: Anthropic.Messages.ContentBlockParam[] = []

  if (options.images?.length) {
    for (const img of options.images) {
      contentParts.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: img.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
          data: img.data,
        },
      })
    }
  }

  contentParts.push({ type: 'text', text: options.userPrompt })

  const response = await anthropic.messages.create({
    model: options.model,
    max_tokens: options.maxTokens || 8192,
    temperature: options.temperature ?? 0.7,
    system: options.systemPrompt || '',
    messages: [{ role: 'user', content: contentParts }],
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
