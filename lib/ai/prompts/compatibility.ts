import { getFocusGroupSpec, type FocusGroup } from '@/lib/domain/compatibility/focus-groups'

/**
 * 궁합 AI 프롬프트 빌더.
 *
 * 원칙(§9): 궁합 출력은 JSON 스키마 계약이고 파서·타입이 코드에 있으므로 프롬프트도 코드로 유지한다.
 * 문구(데이터)는 focus-groups.ts 에, 조립(로직)은 여기에 둔다.
 * FocusGroup 에 따라 질문·특화지시·금지소재·과거역추산 요구를 분기한다.
 */

export interface CompatibilityPromptInput {
  person1Name: string
  person2Name: string
  ctx1PromptContext: string
  ctx2PromptContext: string
  engineTotalScore: number
  engineMulsangNarrative: string
  /** 엔진 카테고리별 요약 텍스트 (label: score — details) */
  categoryBreakdownText: string
  relationship: string
}

const SYSTEM_PROMPT = `당신은 전통 명리학과 현대 관계 심리를 통합하는 궁합 전문 상담가입니다.
반드시 유효한 JSON만 출력하십시오. 다른 텍스트는 포함하지 마십시오.`

function pastRetrogradeBlock(p1: string, p2: string): string {
  return `## 과거 역추산 (신뢰 구축)
두 사주의 대운/세운 충합 시점을 역산하여 관계의 과거를 추론하십시오:
- "처음 만났을 때 한쪽이 먼저 강하게 끌렸을 것입니다" (도화살/홍염살 기반)
- "사귄 지 1~2년차에 심하게 다툰 적이 있으셨죠" (충 시점 기반)
각 추론에 명리학적 근거를 반드시 포함하십시오. (${p1}·${p2} 두 사람 기준)
`
}

export function buildCompatibilityPrompt(input: CompatibilityPromptInput): {
  systemPrompt: string
  userPrompt: string
  focusGroup: FocusGroup
} {
  const spec = getFocusGroupSpec(input.relationship)
  const p1 = input.person1Name
  const p2 = input.person2Name

  const questionsList = spec.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')
  const focusAnswersSchema = spec.questions
    .map(
      (q) =>
        `    { "question": "${q}", "answer": "<2~4문장, 쉬운 말>", "basis": "<근거 한 줄(사주 용어는 괄호로 설명)>" }`
    )
    .join(',\n')

  // 풀이 순서 — 과거 역추산 생성 여부에 따라 분기 (미생성 군은 "과거 역추산" 문구를 넣지 않는다)
  const orderLine = spec.generatePastRetrograde
    ? '반드시 과거 → 현재 → 미래 순서로 풀이하십시오.'
    : '현재 → 미래 순서로 풀이하십시오. 만난 적이 없거나 과거를 되짚는 게 부적절한 관계이므로 지난 사건을 추론하지 마십시오.'

  const pastRetrogradeSchemaLine = spec.generatePastRetrograde
    ? '\n  "pastRetrograde": { "events": [ { "period": "<시점>", "description": "<추론 설명>", "basis": "<명리학적 근거>" } ] },'
    : ''

  const userPrompt = `[첫 번째 사람 - ${p1}의 사주 명식]
${input.ctx1PromptContext}

[두 번째 사람 - ${p2}의 사주 명식]
${input.ctx2PromptContext}

[엔진 궁합 분석 결과 (v3)]
엔진 점수 참고: ${input.engineTotalScore}점 (내부 참고용, 출력에 점수 포함 금지)
물상 내러티브: ${input.engineMulsangNarrative}

카테고리별 분석:
${input.categoryBreakdownText}

[이 관계에서 사람들이 실제 궁금해하는 것 — ${spec.label}]
아래 5개 질문에 focusAnswers[] 로 1:1 대응하여 답하십시오. 질문 문구는 그대로 두고, 각 답은 쉬운 말 2~4문장 + 근거 한 줄로 작성하십시오.
${questionsList}

[이 관계의 특화 지시]
${spec.guidance}

[이 관계에서 금지할 소재 — 절대 언급하지 마십시오]
${spec.forbidden}

[핵심 원칙 — 솔직한 분석]
1. 궁합이 나쁘면 나쁘다고 직설적으로 말하십시오. "노력하면 다 된다"식 미온적 결론은 금지합니다.
2. 엔진 점수 40점 이하면 "이 관계는 서로에게 독이 될 수 있습니다" 수준의 경고를 주십시오.
3. 엔진 점수 50점 이하면 거리를 두는 것도 현명한 선택임을 조언하십시오. 단, 위 특화 지시·금지 소재를 우선합니다(예: 부부 군은 이별을 권유하지 않습니다).
4. 각 사람의 사주에서 드러나는 성격적 단점을 구체적으로 지적하십시오 (예: "甲木(갑목, 큰 나무 성향)이 강한 ${p1}은 고집이 세고 타협을 못합니다").
5. 사주 용어는 반드시 괄호 안에 쉬운 설명을 붙이십시오.
6. 두 사람이 만났을 때 실제로 반복될 갈등 패턴을 구체적 시나리오로 서술하십시오(conflictScenario).
7. recommendedPlaces 에는 이 관계에 맞는 "${spec.placesLabel}" 3가지를 오행 기반으로 구체적으로 제시하십시오(연애가 아닌 관계면 데이트 장소가 아니라 함께할 활동·협업 방식 등으로).

${spec.generatePastRetrograde ? pastRetrogradeBlock(p1, p2) : ''}## 풀이 순서
${orderLine}
갈등 포인트를 지적할 때는 반드시 구체적 해결법을 함께 제시하십시오.
시기는 "올해 하반기", "내년 봄" 등 구체적으로, 행동 처방은 즉시 실행 가능하게 작성하십시오.

## 월별 맞춤 조언
향후 12개월 중 이 관계에 중요한 달을 최소 4개 선정하여, 각 달의 조언과 명리학적 근거를 monthlyAdvice 로 제시하십시오.

[지시사항]
위 두 사람의 명식과 엔진 결과를 바탕으로 현실적이고 실용적으로 분석하십시오.
강점과 약점을 균형있게 다루되, 문제가 있으면 명확히 지적하십시오.
숫자 점수는 출력하지 말고 텍스트 평가를 사용하십시오.

[출력 형식 (JSON Mandatory) — 아래 키만, 유효한 JSON만]
{
  "overallAssessment": "<'좋은 궁합' | '보통 궁합' | '어려운 궁합' | '주의가 필요한 궁합' 중 하나>",
  "summary": "<관계를 한 줄로 정리한 핵심 통찰. 쉬운 현대 한국어.>",
  "focusAnswers": [
${focusAnswersSchema}
  ],
  "honestVerdict": "<이 관계에 대한 솔직한 한마디>",
  "person1Weakness": "<${p1}의 성격적 약점과 이 관계에서 문제가 될 수 있는 구체적 행동 패턴 (2~3문장)>",
  "person2Weakness": "<${p2}의 성격적 약점과 이 관계에서 문제가 될 수 있는 구체적 행동 패턴 (2~3문장)>",
  "conflictScenario": "<두 사람이 실제로 부딪힐 때 반복될 갈등 패턴을 구체적 시나리오로 (3~4문장)>",${pastRetrogradeSchemaLine}
  "monthlyAdvice": [ { "month": "<N월>", "advice": "<구체적 행동 조언>", "basis": "<명리학적 근거>" } ],
  "strengths": [ "<서로에게 도움이 되는 구체적인 점>", "<긍정적인 면 2>" ],
  "warnings": [ "<반드시 조심해야 할 핵심 위험. 구체적으로.>", "<경고 2>", "<경고 3>" ],
  "recommendedPlaces": [ "<${spec.placesLabel} 1 + 이유>", "<2>", "<3>" ],
  "advice": "<솔직한 조언. 현재 핵심 문제 → 구체적 해결책 또는 거리두기 권고 → 지금 바로 실천할 행동지침. 줄바꿈(\\n) 포함 300~500자.>"
}`

  return { systemPrompt: SYSTEM_PROMPT, userPrompt, focusGroup: spec.group }
}
