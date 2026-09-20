/** @jest-environment node */
/**
 * Jev 한국어 정확도 실측 — 실제 API 를 부른다. 평소 테스트에서는 돌지 않는다.
 *
 *   JEV_EVAL=1 TYPESAFE_API_KEY=... npx jest lib/domain/threads/__tests__/jev-eval.live.test.ts
 *
 * 공식 문서에 한국어 성능이 적혀 있지 않다. 규칙 분류가 놓치는 애매한 댓글로 재서, JEV_REPLY_MIN_CONFIDENCE 기준에서
 * 정확도 90% 이상이어야 통과다. 못 미치면 기준을 올리거나 Threads 에서 Jev 를 뺀다(키를 지우면 기존 경로만 돈다).
 */
import {
  JEV_REPLY_MIN_CONFIDENCE,
  REPLY_CLASS_CRITERIA,
  REPLY_CLASS_INSTRUCTIONS,
  classifyReply,
  needsAiClassification,
  type ReplyClass,
} from '@/lib/domain/threads/classify'
import { askJev } from '@/lib/services/jev-client'

jest.mock('@/lib/services/gemini-rate-limiter', () => ({ logUsage: jest.fn().mockResolvedValue(undefined) }))

const SAMPLES: ReadonlyArray<readonly [string, ReplyClass]> = [
  ['93년 4월 12일 오전 8시생 여자입니다', 'apply'],
  ['올해 이직운이 어떤지 알고 싶네요 88년생이에요', 'apply'],
  ['혹시 남자친구랑 같이 봐주실 수 있나요 둘 다 적을게요', 'apply'],
  ['손 들어봅니다 🙋‍♀️', 'apply'],
  ['이번 주 라운드 아직 자리 남았으면 저 넣어주세요', 'apply'],
  ['1990.11.03 양력 새벽 2시 남', 'apply'],
  ['태어난 시간을 모르면 풀이가 안 되는 건가요', 'question'],
  ['음력으로 넣어야 하는지 양력으로 넣어야 하는지 모르겠어요', 'question'],
  ['결과는 디엠으로 오는 건지 여기 댓글로 달리는 건지', 'question'],
  ['앱이 따로 있는 건가요 아니면 사이트에서만', 'question'],
  ['일간이 갑목이면 올해가 힘들다던데 맞는 말인지', 'question'],
  ['유료 풀이랑 이벤트 풀이랑 내용이 다른가요', 'question'],
  ['와 제 얘기인 줄 알았어요 소름', 'chat'],
  ['글 읽다가 눈물 났네요 요즘 너무 지쳐서', 'chat'],
  ['매번 잘 보고 있습니다', 'chat'],
  ['이런 계정 있는 줄 이제 알았네', 'chat'],
  ['저번에 봐주신 거 진짜 그대로 됐어요', 'chat'],
  ['월요일 아침부터 위로받고 갑니다', 'chat'],
  ['부업으로 월 300 버는 법 프로필 링크 확인', 'spam'],
  ['사주 다 사기임 이런 거 믿는 사람들 한심', 'spam'],
  ['맞팔해요 선팔했어요 제 계정도 놀러오세요', 'spam'],
  ['재테크 정보방 운영 중입니다 오픈채팅 검색 ㄱㄱ', 'spam'],
  ['신점 잘 보는 곳 소개해드려요 쪽지 주세요', 'spam'],
  ['ㅇㅈ', 'other'],
  ['...', 'other'],
  ['@minji_0412', 'other'],
  ['3번', 'other'],
]

// 이 검사는 늘 돈다(API 를 부르지 않는다). 규칙이 이미 확신하는 댓글은 프로덕션에서 Jev 까지 오지 않는다 —
// 그런 표본이 섞이면 실측 정확도가 실제 모집단의 것이 아니게 된다.
describe('Jev 실측 표본', () => {
  it('전부 «규칙이 못 정해 AI 2차로 넘어가는» 댓글이다', () => {
    expect(SAMPLES.filter(([text]) => !needsAiClassification(classifyReply(text))).map(([text]) => text)).toEqual([])
  })
})

const run = process.env.JEV_EVAL === '1' && !!process.env.TYPESAFE_API_KEY ? describe : describe.skip

run('Jev 한국어 댓글 분류 실측', () => {
  it(`확신 ${JEV_REPLY_MIN_CONFIDENCE} 이상인 답의 정확도가 90% 이상`, async () => {
    const rows: Array<{ text: string; expected: ReplyClass; got: string; confidence: number; ms: number }> = []
    for (const [text, expected] of SAMPLES) {
      const startedAt = Date.now()
      const answers = await askJev({
        state: text,
        questions: {
          intent: { type: 'choice', instructions: REPLY_CLASS_INSTRUCTIONS, criteria: REPLY_CLASS_CRITERIA },
        },
        actionType: 'threads_classify_jev',
      })
      const intent = answers?.intent
      rows.push({
        text,
        expected,
        got: intent?.type === 'choice' ? intent.choice : 'FAILED',
        confidence: intent?.type === 'choice' ? intent.confidence : 0,
        ms: Date.now() - startedAt,
      })
    }

    const acted = rows.filter((r) => r.confidence >= JEV_REPLY_MIN_CONFIDENCE)
    const correct = (list: typeof rows) => list.filter((r) => r.got === r.expected).length
    const report = [
      `전체 정확도      ${correct(rows)}/${rows.length}`,
      `기준 이상 정확도  ${correct(acted)}/${acted.length}  (적용률 ${Math.round((acted.length / rows.length) * 100)}%)`,
      `평균 지연        ${Math.round(rows.reduce((sum, r) => sum + r.ms, 0) / rows.length)}ms`,
      ...rows
        .filter((r) => r.got !== r.expected)
        .map((r) => `  ✗ [${r.expected}→${r.got} ${r.confidence.toFixed(2)}] ${r.text}`),
    ]
    process.stdout.write(`\n${report.join('\n')}\n`)

    expect(rows.filter((r) => r.got === 'FAILED')).toEqual([])
    // 한두 건만 확신해도 정확도는 100% 가 된다 — 절반은 스스로 정해야 Gemini 호출을 줄인다는 도입 이유가 선다.
    expect(acted.length / rows.length).toBeGreaterThanOrEqual(0.5)
    expect(correct(acted) / acted.length).toBeGreaterThanOrEqual(0.9)
    // 실제로 일을 일으키는 분류는 apply 뿐이다(안내 답글 초안이 큐에 들어간다) — 확신한 apply 는 틀리면 안 된다.
    expect(acted.filter((r) => r.got === 'apply' && r.expected !== 'apply').map((r) => r.text)).toEqual([])
  }, 120_000)
})
