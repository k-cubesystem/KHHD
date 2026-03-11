import {
  FEATURE_MODELS,
  DEFAULT_PROVIDER,
  GEMINI_PRO,
  GEMINI_FLASH,
  GEMINI_IMAGE,
  CLAUDE_OPUS,
  CLAUDE_SONNET,
} from '@/lib/config/ai-models'

export const dynamic = 'force-dynamic'

export default function AIModelsPage() {
  const features = Object.entries(FEATURE_MODELS)
  const claudeFeatures = features.filter(([, c]) => c.provider === 'claude')
  const geminiFeatures = features.filter(([, c]) => c.provider === 'gemini')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI 모델 설정 현황</h1>
        <p className="text-muted-foreground mt-1">
          현재 기본 프로바이더: <strong className="text-foreground">{DEFAULT_PROVIDER.toUpperCase()}</strong>
          <span className="ml-2 text-xs">(AI_PROVIDER 환경변수로 변경)</span>
        </p>
      </div>

      {/* Available Models */}
      <div className="rounded-lg border p-4">
        <h2 className="font-semibold mb-3">사용 가능한 모델</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-blue-600">Gemini (Google)</h3>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>
                <code className="bg-muted px-1 rounded">{GEMINI_PRO}</code> — 핵심 분석 (PRO)
              </li>
              <li>
                <code className="bg-muted px-1 rounded">{GEMINI_FLASH}</code> — 채팅/운세 (FLASH)
              </li>
              <li>
                <code className="bg-muted px-1 rounded">{GEMINI_IMAGE}</code> — 이미지 생성
              </li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-purple-600">Claude (Anthropic)</h3>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>
                <code className="bg-muted px-1 rounded">{CLAUDE_OPUS}</code> — 핵심 분석 (OPUS)
              </li>
              <li>
                <code className="bg-muted px-1 rounded">{CLAUDE_SONNET}</code> — 채팅/운세 (SONNET)
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{geminiFeatures.length}</div>
          <div className="text-sm text-muted-foreground">Gemini 기능</div>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{claudeFeatures.length}</div>
          <div className="text-sm text-muted-foreground">Claude 기능</div>
        </div>
      </div>

      {/* Feature Table */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">기능</th>
              <th className="text-left p-3 font-medium">프로바이더</th>
              <th className="text-left p-3 font-medium">모델</th>
            </tr>
          </thead>
          <tbody>
            {features.map(([key, config]) => (
              <tr key={key} className="border-t">
                <td className="p-3 font-mono text-xs">{key}</td>
                <td className="p-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      config.provider === 'claude'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}
                  >
                    {config.provider}
                  </span>
                </td>
                <td className="p-3 font-mono text-xs text-muted-foreground">{config.model}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-muted-foreground">
        <p>* image, generate-image 기능은 항상 Gemini를 사용합니다 (비전/이미지 생성).</p>
        <p>
          * 프로바이더를 변경하려면 <code>AI_PROVIDER=claude</code> 환경변수를 설정하세요.
        </p>
        <p>
          * Claude 사용 시 <code>ANTHROPIC_API_KEY</code> 환경변수가 필요합니다.
        </p>
      </div>
    </div>
  )
}
