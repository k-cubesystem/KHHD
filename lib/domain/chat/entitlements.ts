/**
 * 속풀이 질문권 자격(entitlement) 단일 출처 — 순수 로직(서버·클라이언트 공용).
 *
 * 왜 파일을 새로 가르나: 종전에는 `DAILY_FREE_QUESTIONS` 상수 하나가 «전 등급 동일»한
 * 하루 무료분을 뜻했고, 멤버십·1일권은 «입장»만 열었다. 2026-08-25 CEO 결정으로
 * 무료 일일분이 폐지되고 주머니가 넷(온보딩·멤버십 주간·광고·구매)으로 갈렸다.
 * 규칙이 화면마다 갈라지지 않도록 수치·창 계산을 전부 여기로 모은다.
 *
 * 🔴 광고 지급량·상한의 정본은 여기가 아니라 DB `system_settings`
 *    (chat_ad_visit_reward · chat_ad_daily_sets · chat_ad_credit_expire_hours)이다.
 *    어드민이 무배포로 조정하므로 JS 에 숫자를 복제하지 말 것.
 *
 * 🔴 «무제한» 금지 — 멤버십도 주 10회 상한이 있다. 마스터(admin) role 만 예외다.
 */

/** 무료 일일 질문 — 2026-08-25 폐지. 일반 사용자·신규 가입자는 0이다. */
export const FREE_DAILY_QUESTIONS = 0

/** 멤버십 회원에게 «구독 주기 기준 7일»마다 주어지는 질문 수. */
export const MEMBER_WEEKLY_QUESTIONS = 10

/** 명식(생년월일시) 입력을 마친 계정에 평생 한 번 주어지는 맛보기 질문 수. */
export const ONBOARDING_FREE_QUESTIONS = 1

/** 질문권 구매가 — 복채 만냥 단위(wallets.balance 1 = 1만냥). */
export const PURCHASE_COST_BOKCHAE = 1

/** 질문권 1회 구매로 주어지는 질문 수. */
export const PURCHASE_QUESTIONS = 10

/** 구매 질문권 소비기한(일). 구매 시점부터 이 기간이 지나면 소멸한다. */
export const PURCHASE_EXPIRE_DAYS = 30

const DAY_MS = 86_400_000
const WEEK_MS = 7 * DAY_MS

/** 멤버십 주간 창 — 반열림 구간 [start, end). */
export interface WeekWindow {
  startIso: string
  endIso: string
}

/**
 * 멤버십 주간 창을 «구독 시작일»에 앵커해 계산한다.
 *
 * 달력 월요일 리셋을 쓰지 않는 이유: 일요일 결제자가 하루 만에 주간치를 잃는다.
 * 구독 주기에 맞물리면 «돈 낸 날부터 7일»이 되어 가입 시점에 따른 손해가 없다.
 *
 * periodStart 가 now 보다 미래이면(시계 오차·선결제) 첫 주기를 그대로 돌려준다.
 */
/**
 * 사용 기록에 적는 날짜 키 — **KST 기준 'YYYY-MM-DD'**.
 *
 * 🔴 여기가 UTC 였다(2026-08-26 수복). 주간 사용량을 세는 SQL(get_member_week_turns)은
 *    `(p_window_start AT TIME ZONE 'Asia/Seoul')::date` 로 **KST** 로 읽는데, 쓰는 쪽만
 *    `toISOString()`(UTC)이라 9시간이 어긋났다. 주 경계가 지나는 순간 새 창의 시작 날짜가
 *    UTC 날짜보다 하루 앞서, 그 사이(최대 9시간)에 쓴 문답이 닫힌 옛 날짜로 적혀
 *    새 창이 세지 못했다 — 사용량이 0에 고정되어 **주 1회, 최대 9시간 무제한**이 됐다.
 *    KST 날짜 판정의 정본은 SQL 한 곳이다. 쓰기도 같은 자로 잰다.
 */
export function chatUsageDateKey(now: Date = new Date()): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export function memberWeekWindow(periodStartMs: number, nowMs: number): WeekWindow {
  const elapsed = nowMs - periodStartMs
  const weeksElapsed = elapsed > 0 ? Math.floor(elapsed / WEEK_MS) : 0
  const start = periodStartMs + weeksElapsed * WEEK_MS
  return {
    startIso: new Date(start).toISOString(),
    endIso: new Date(start + WEEK_MS).toISOString(),
  }
}

/** 구매 질문권 만료 시각 — 구매 시점 + PURCHASE_EXPIRE_DAYS. 순수. */
export function purchaseExpiryFrom(nowMs: number): Date {
  return new Date(nowMs + PURCHASE_EXPIRE_DAYS * DAY_MS)
}

/**
 * 만료 시각이 지났는지. `expiresAt` 이 null 이면 «무기한»으로 본다 —
 * 소비기한 도입(2026-08-25) 이전에 구매한 질문권이 여기 해당한다.
 * 이미 무기한으로 판 물건에 소급 만료를 걸지 않는다.
 */
export function isCreditExpired(expiresAt: string | null, nowMs: number): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt).getTime() <= nowMs
}

/** 네 주머니의 잔여를 합산한다. 순수 — 화면·서버가 같은 값을 본다. */
export function totalRemainingOf(buckets: {
  onboarding: number
  memberWeekly: number
  ad: number
  purchased: number
}): number {
  return buckets.onboarding + buckets.memberWeekly + buckets.ad + buckets.purchased
}
