/**
 * 웹툰 「내 이야기」 접수 — 독자의 사연을 받아 선정되면 한 화로 그려 드리는 프로그램.
 * 기획 전문은 TEAM_G_DESIGN/prd/PLAN-webtoon-story-v1.md.
 *
 * ⚠️ 이 표는 **사연 원문과 연락처가 함께 있는 유일한 자리**다. 그래서 규율이 다른 곳보다 엄하다:
 *    · 공개 정책이 없다(본인 조회 하나뿐, 운영자는 service_role 로만 본다)
 *    · 화면 어디에도 남의 사연이 뜨지 않는다 — 목록도 카운트도 없다
 *    · 접수 확인 화면조차 연락처를 되보여 주지 않는다(어깨너머로 읽히는 것까지 막는다)
 *
 * 전 함수 순수·결정론. 검증은 여기서 한 벌만 정의하고 화면·서버가 같은 것을 쓴다 —
 * 두 벌이면 한쪽만 고쳐져 "화면은 통과인데 서버가 거절"이 된다.
 */

/** 하루(KST) 접수 상한. 사연은 오래 쓰는 글이라 넉넉할 이유가 없다. */
export const STORY_DAILY_LIMIT = 3

/**
 * ⚠️ 접수는 **누구나 무료**다 (CEO 2026-08-01 재확정: "이야기 접수는 회원 전부 접수 가능,
 *    제작은 멤버십 멤버만").
 *
 * 직전 안(비회원 5만냥)은 **폐기했다**. 제작 자격을 멤버십으로 좁히면서 값을 그대로 두면
 * "그려질 수 없는 사람에게 값을 받는" 구조가 된다 — 확률이 낮은 복권도 아니고 **당첨될 수 없는
 * 복권**이라 어떤 문구로도 정당화되지 않는다. 둘 중 하나는 없어야 했고, 없앨 것은 값이었다.
 *
 * 대신 이 프로그램은 **멤버십 유입 장치**가 된다: 사연은 누구나 보내고, 그려지려면 멤버십이 필요하다.
 * 일회성 5만냥보다 이 편이 사업에도 낫다.
 */
export const STORY_SUBMIT_COST = 0

export const STORY_TITLE_MIN = 2
export const STORY_TITLE_MAX = 60
/** 사연 본문 — 너무 짧으면 그릴 수 없고, 너무 길면 읽히지 않는다. */
export const STORY_BODY_MIN = 50
export const STORY_BODY_MAX = 4000
export const STORY_NAME_MAX = 40
export const STORY_PHONE_MIN = 6
export const STORY_PHONE_MAX = 30
export const STORY_KAKAO_MAX = 60
/** 운영자 회신 한마디 — 편지가 아니라 한마디다. 길어지면 상담이 되고, 상담은 여기서 감당 못 한다. */
export const STORY_REPLY_MAX = 500

/** 접수 상태 — 스키마 CHECK 와 **문자열이 같아야 한다**. */
export type StoryStatus = 'received' | 'reviewing' | 'selected' | 'declined'

export const STORY_STATUS_LABEL: Readonly<Record<StoryStatus, string>> = Object.freeze({
  received: '접수되었습니다',
  reviewing: '읽고 있습니다',
  selected: '선정되었습니다 — 곧 연락드립니다',
  declined: '이번에는 함께하지 못했습니다',
})

export function isStoryStatus(v: unknown): v is StoryStatus {
  return v === 'received' || v === 'reviewing' || v === 'selected' || v === 'declined'
}

// ─── 고지 ────────────────────────────────────────────────────
//
// CEO 지시 그대로다: **비공개**로 청담해화당에 접수되고, 제작을 위한 소통에 쓰이며,
// 선정되면 연락이 간다는 것을 폼에서 **먼저** 말한다.

export const STORY_PRIVACY_NOTICE =
  '보내신 사연은 공개되지 않습니다 — 청담해화당으로만 전해지고, 웹툰 어디에도 그대로 실리지 않습니다.'

export const STORY_CONTACT_NOTICE =
  '성함·연락처·카카오톡 아이디는 **이야기 제작을 위한 연락에만** 씁니다. 공개되지 않으며 선정되신 경우에만 연락드립니다.'

export const STORY_SELECTION_NOTICE =
  '선정되면 담당자가 연락드려 어디까지 그려도 좋을지 함께 정합니다 — 이름·지명은 바꾸고, 원하지 않으시는 대목은 뺍니다.'

/** 접수는 누구나 · 값 없이. */
export const STORY_FREE_NOTICE = '사연 접수는 복채가 들지 않습니다 — 회원이시면 누구나 보내실 수 있습니다.'

/**
 * 제작 자격 — **멤버십 회원만 그려 드린다**(CEO 2026-08-01).
 *
 * ⚠️ 이 사실을 **보내기 전에** 말해야 한다. 다 쓰고 보낸 뒤에 "회원이 아니라 그릴 수 없다"고
 *    알리면, 값을 받지 않았어도 사람의 시간을 받은 것이 된다.
 */
export const STORY_MEMBER_ONLY_NOTICE =
  '웹툰으로 그려 드리는 것은 멤버십 회원의 사연입니다 — 회원이 아니시면 사연은 보관되고, 가입하신 뒤 선정 대상이 됩니다.'

/** 회신 약속 — 값을 받지 않아도 읽었으면 답한다. */
export const STORY_REPLY_NOTICE = '보내 주신 사연은 모두 읽고, 선정 여부와 무관하게 답을 남겨 드립니다.'

/** 선정되어 제작에 들어갈 때 추가 비용이 없다는 약속. */
export const STORY_NO_EXTRA_COST_NOTICE = '선정되어 웹툰으로 그려질 때 추가로 드는 비용은 없습니다.'

// ─── 검증 ────────────────────────────────────────────────────

export interface StoryDraft {
  readonly title: string
  readonly body: string
  readonly contactName: string
  readonly contactPhone: string
  readonly contactKakao: string
}

export type StoryField = 'title' | 'body' | 'contactName' | 'contactPhone' | 'contactKakao'

/** 어긋난 칸과 이유. 통과면 빈 배열이다. */
export interface StoryIssue {
  readonly field: StoryField
  readonly message: string
}

const len = (s: string): number => s.trim().length

/**
 * 전화번호는 **모양을 강제하지 않는다** — 숫자만, 하이픈, 국가번호, 해외번호가 다 온다.
 * 대신 "숫자가 최소 몇 자 이상 들어 있는가"만 본다. 형식을 좁히면 진짜 번호가 막히고,
 * 막힌 사람은 사연을 포기한다.
 */
function digitCount(s: string): number {
  let n = 0
  for (const ch of s) if (ch >= '0' && ch <= '9') n += 1
  return n
}

export function validateStory(draft: StoryDraft): readonly StoryIssue[] {
  const out: StoryIssue[] = []

  if (len(draft.title) < STORY_TITLE_MIN) out.push({ field: 'title', message: '제목을 지어 주세요' })
  else if (len(draft.title) > STORY_TITLE_MAX)
    out.push({ field: 'title', message: `제목은 ${STORY_TITLE_MAX}자까지입니다` })

  if (len(draft.body) < STORY_BODY_MIN)
    out.push({ field: 'body', message: `사연은 ${STORY_BODY_MIN}자 이상 들려주세요` })
  else if (len(draft.body) > STORY_BODY_MAX)
    out.push({ field: 'body', message: `사연은 ${STORY_BODY_MAX}자까지입니다` })

  if (len(draft.contactName) < 1) out.push({ field: 'contactName', message: '성함을 적어 주세요' })
  else if (len(draft.contactName) > STORY_NAME_MAX)
    out.push({ field: 'contactName', message: `성함은 ${STORY_NAME_MAX}자까지입니다` })

  const phone = draft.contactPhone.trim()
  if (len(phone) < STORY_PHONE_MIN || digitCount(phone) < 8)
    out.push({ field: 'contactPhone', message: '연락 가능한 번호를 적어 주세요' })
  else if (len(phone) > STORY_PHONE_MAX)
    out.push({ field: 'contactPhone', message: `번호는 ${STORY_PHONE_MAX}자까지입니다` })

  if (len(draft.contactKakao) > STORY_KAKAO_MAX)
    out.push({ field: 'contactKakao', message: `카카오톡 아이디는 ${STORY_KAKAO_MAX}자까지입니다` })

  return Object.freeze(out)
}

export function isStoryValid(draft: StoryDraft): boolean {
  return validateStory(draft).length === 0
}

// ─── 운영자 메일 ─────────────────────────────────────────────

/**
 * 접수 알림 메일의 제목·본문.
 *
 * ⚠️ **사연 원문과 연락처를 메일 본문에 싣지 않는다.** 메일은 전달 경로가 길고(중계 서버·스팸함·
 *    포워딩) 한 번 나가면 회수할 수 없다. 여기서는 "무엇이 들어왔는지"와 어디서 보는지만 알리고,
 *    내용은 운영자가 관리 화면에서 본다 — 사연은 DB 한 곳에만 있어야 한다.
 */
export function storyMailSubject(title: string, no: number | null): string {
  const head = no && no > 0 ? `[내 이야기 #${no}]` : '[내 이야기]'
  const t = title.trim()
  return `${head} ${t.length > 40 ? `${t.slice(0, 40)}…` : t}`
}

export function storyMailBody(input: { submissionId: string; receivedAt: string; bodyLength: number }): string {
  return [
    '웹툰 「내 이야기」가 한 건 접수되었습니다.',
    '',
    `접수번호 : ${input.submissionId}`,
    `접수시각 : ${input.receivedAt}`,
    `사연길이 : ${input.bodyLength}자`,
    '',
    '사연 원문과 연락처는 메일에 담지 않습니다 — 관리 화면에서 확인해 주세요.',
  ].join('\n')
}
