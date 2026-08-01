/**
 * 「기원굿(祈願굿)」 — 백일기도를 마친 이의 소원을 굿 영상으로 만들어 드리는 의식 R-5.
 * 조사·설계 전문은 TEAM_G_DESIGN/prd/PLAN-gut-video-v1.md.
 *
 * ─── 무엇을 만드는가 ─────────────────────────────────────────
 *
 * 산 사람이 복을 청하는 굿은 **재수굿** 계열이다(망자를 천도하는 진오기굿, 병을 물리는 병굿과는
 * 목적도 법도도 다르다 — 섞으면 안 된다). 기원굿은 그 재수굿의 짜임을 3분 규격으로 줄인 것이다.
 *
 * ⚠️ 굿의 뼈대는 **부정으로 열고 뒷전으로 닫는다**. 이 두 거리는 순서를 바꿀 수 없다 —
 *    부정거리는 굿판을 씻는 자리이고 뒷전은 굿판에 못 든 잡신까지 먹여 보내는 자리라,
 *    자리를 옮기면 굿이 아니라 굿 흉내가 된다. 가운데 거리만 목적에 따라 늘고 준다.
 *
 * ⚠️ 이 모듈은 **영상을 만들지 않는다**(CEO 2026-08-01: 힉스필드 연동은 테스트 후).
 *    여기 있는 것은 자격 판정과 축원문 조립까지다.
 */

/** 굿거리 한 대목. 순서는 이 배열 그대로다. */
export interface GutSegment {
  readonly key: string
  readonly name: string
  readonly hanja: string
  /** 길이(초) */
  readonly sec: number
  /** 이 대목이 하는 일 — 영상 연출 지시의 뿌리 */
  readonly does: string
  /** 사용자마다 달라지는 대목인가(제작 단가의 핵심) */
  readonly personal: boolean
}

export const GUT_SEGMENTS: readonly GutSegment[] = Object.freeze([
  Object.freeze({
    key: 'bujeong',
    name: '부정거리',
    hanja: '不淨',
    sec: 20,
    does: '촛불과 정화수로 굿판을 씻는다. 반드시 맨 처음이다.',
    personal: false,
  }),
  Object.freeze({
    key: 'cheongbae',
    name: '청배',
    hanja: '請陪',
    sec: 25,
    does: '방울과 부채로 신을 청한다(청신).',
    personal: false,
  }),
  Object.freeze({
    key: 'bongeori',
    name: '본거리',
    hanja: '本',
    sec: 90,
    does: '모시는 신위 앞에서 축원문을 아뢴다 — 이름·생년·소원이 여기 들어간다(오신).',
    personal: true,
  }),
  Object.freeze({
    key: 'daegam',
    name: '대감거리',
    hanja: '大監',
    sec: 30,
    does: '재물과 복을 맡는 대감신에게서 복을 나눠 받는다. 재수굿의 알맹이다.',
    personal: false,
  }),
  Object.freeze({
    key: 'dwitjeon',
    name: '뒷전',
    hanja: '後',
    sec: 15,
    does: '기를 말아 어깨에 메고 물러난다. 굿판에 못 든 것들까지 먹여 보낸다(송신). 반드시 맨 끝이다.',
    personal: false,
  }),
])

/** 영상 총 길이(초). */
export const GUT_TOTAL_SEC = GUT_SEGMENTS.reduce((n, s) => n + s.sec, 0)

/** 신청 상태 — 스키마 CHECK 와 **문자열이 같아야 한다**. */
export type GutStatus =
  | 'requested'
  | 'script_ready'
  | 'queued'
  | 'rendering'
  | 'review'
  | 'delivered'
  | 'failed'
  | 'canceled'

export const GUT_STATUS_LABEL: Readonly<Record<GutStatus, string>> = Object.freeze({
  requested: '접수되었습니다',
  script_ready: '축원문이 준비되었습니다',
  queued: '제작을 기다리는 중입니다',
  rendering: '굿을 올리는 중입니다',
  review: '마지막으로 살펴보는 중입니다',
  delivered: '영상이 준비되었습니다',
  failed: '제작이 멈췄습니다 — 다시 접수해 드립니다',
  canceled: '취소되었습니다',
})

/** 신청 갈래 — 완주로 얻은 것과 값을 치르고 청하는 것. */
export type GutKind = 'completion' | 'petition'

export function isGutKind(v: unknown): v is GutKind {
  return v === 'completion' || v === 'petition'
}

/**
 * 남은 **완주 기원굿** 수 — 완주 회차 수에서 이미 쓴 신청 수를 뺀다.
 *
 * 완주 자격은 회차마다 하나다(트로피와 같은 눈금). 취소된 신청은 쓴 것으로 세지 않는다 —
 * 그 판정은 서버가 하고 여기는 이미 걸러진 수를 받는다.
 */
export function remainingFreeGut(completedCount: number, usedCount: number): number {
  const done = Number.isFinite(completedCount) ? Math.max(0, Math.floor(completedCount)) : 0
  const used = Number.isFinite(usedCount) ? Math.max(0, Math.floor(usedCount)) : 0
  return Math.max(0, done - used)
}

// ─── 축원문(祝願文) ───────────────────────────────────────────
//
// 전승의 고축 형식 그대로다 — 언제·어디 사는·몇 년생·누가·어느 신 앞에·무엇을 비는가.
// **결정론 조립**이라 AI 비용이 0이고 사람이 미리 검수할 수 있다(생성문은 검수가 불가능하다).

export interface ChukwonInput {
  readonly name: string | null
  readonly birthYear: number | null
  /** 모시는 주신 이름 */
  readonly deity: string | null
  /** 백 일 동안 붙든 소원 한 줄 */
  readonly wish: string | null
  /** 완주 회차 */
  readonly round: number | null
  /** 아뢰는 날 — 'YYYY-MM-DD'(KST). 호출자가 준다(모듈은 시각을 읽지 않는다) */
  readonly dayKey: string
}

/** 'YYYY-MM-DD' → '모월 모일' 표기. 형식이 어긋나면 날짜 줄을 뺀다. */
function datePhrase(dayKey: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey.trim())
  if (!m) return null
  return `${Number(m[1])}년 ${Number(m[2])}월 ${Number(m[3])}일`
}

/**
 * 축원문 — 문단 배열. 영상의 낭독 대본이자 화면 미리보기다.
 *
 * ⚠️ 없는 재료는 **빼고 짓는다**. 이름이 없으면 "이 몸이"로 아뢰고 소원이 없으면 그 줄이 사라진다 —
 *    빈칸에 그럴듯한 말을 채우면 남의 축원문이 된다.
 */
export function chukwonText(input: ChukwonInput): readonly string[] {
  const who = (input.name ?? '').trim()
  const born = input.birthYear && input.birthYear > 0 ? `${input.birthYear}년생 ` : ''
  const subject = who.length > 0 ? `${born}${who}이(가)` : '이 몸이'
  const deity = (input.deity ?? '').trim() || '모시는 신위'
  const wish = (input.wish ?? '').trim()
  const day = datePhrase(input.dayKey)

  const out: string[] = []
  out.push(`${day ? `${day}, ` : ''}${subject} ${deity} 앞에 나아가 아뢰옵니다.`)
  out.push(
    input.round && input.round > 0
      ? `백 일 정성 ${input.round}회차를 다 채우고 이 자리에 섰습니다.`
      : '백 일 정성을 다 채우고 이 자리에 섰습니다.'
  )
  if (wish.length > 0) out.push(`비옵는 바는 「${wish}」 한 가지올시다.`)
  out.push('부정을 물리고 길을 열어 주시옵고, 이 정성이 헛되지 않게 하여 주시옵소서.')
  return Object.freeze(out)
}

/** 화면 고지 — 무엇이 담기는지 먼저 말한다. */
export const GUT_NOTICE = '축원문에는 이름·생년·모시는 신위·백일 소원이 담깁니다. 만들어진 영상은 나만 볼 수 있습니다.'

export const GUT_DISCLAIMER = '재미로 즐기는 전통 의식 놀이입니다. 의학적·심리적 상담을 대신하지 않습니다.'
