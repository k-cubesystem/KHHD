/**
 * 멤버십 혜택 문구 단일 출처 — 순수 변환(서버·클라이언트 공용).
 *
 * 🔴 숫자·주기를 이 파일이 «만들지» 않는다. 전부 membership_plans(DB) 행에서 흘러들어온다.
 *    화면이 숫자를 직접 쓰면 플랜을 고칠 때마다 문구가 어긋나므로, 표기는 여기로 모은다.
 *
 * 🔴 문구 사실관계(2026-08-12 코드 실측 — 표시광고법 정정):
 *  - talismans_per_period = «결제 주기마다» 1회 지급되는 복채. 지급 경로는 첫 결제
 *    (app/actions/payment/subscription.ts)와 갱신(app/api/cron/billing) 두 곳뿐이다.
 *    → «매일 지급»은 사실이 아니다.
 *  - daily_talisman_limit = 지급받은 복채의 «하루 사용 상한»이다(충전한 복채는 상한 면제 —
 *    app/actions/payment/wallet.ts computeSpendPlan). 혜택이 아니라 한도이므로 «지급»으로 쓰지 않는다.
 *  - 고민상담은 회원·비회원 모두 하루 10문이다(app/actions/ai/shaman-chat.ts DAILY_FREE_QUESTIONS).
 *    멤버십과 1일 이용권이 여는 것은 «입장»뿐이다 → «무제한» 금지.
 *  - 멤버십 회원도 풀이마다 복채를 낸다(wallet.ts deductTalisman 에 구독 우회 없음, 마스터 role 만 면제)
 *    → «모두 이용»·«무제한» 금지.
 *  - storage_limit 은 보관 «개수» 상한이고, 초과분은 즐겨찾기가 아닌 오래된 기록부터 자동 삭제된다
 *    (app/actions/user/history.ts) → «평생 보관» 금지.
 */

/** storage_limit 이 이 값이면 개수 제한 없음(기존 DB 관례). */
export const UNLIMITED_STORAGE_LIMIT = 999

/**
 * 무료 사용자 기록 보관 기간(일). 이 기간 이전 기록은 삭제하지 않고 잠근다(멤버십 가입 시 복원).
 * 서버 판정(lib/auth/subscription.ts)과 화면 문구가 같은 값을 봐야 해서 순수 모듈인 여기에 둔다.
 */
export const FREE_RETENTION_DAYS = 30

/**
 * 멤버십이 없는 사용자의 한도 — app/actions/payment/membership.ts getUserTierLimits 가 돌려주는 값과
 * 같은 출처여야 한다(등급 비교표가 실제와 어긋나던 자리). 여기가 정본이고 그쪽이 이걸 읽는다.
 */
export const FREE_TIER_LIMITS = {
  /** 주기 지급 복채 없음. */
  talismansPerPeriod: 0,
  /** 지급분이 없으니 하루 사용 상한도 0(충전한 복채는 상한 없이 쓴다). */
  dailyTalismanLimit: 0,
  relationshipLimit: 3,
  /** 보관 개수 5개(CEO 2026-08-15). 초과분은 즐겨찾기가 아닌 오래된 기록부터 자동 삭제. */
  storageLimit: 5,
} as const

/** 혜택 문구에 필요한 플랜 사실만 — 구조적 타입이라 서버 모듈을 끌어오지 않는다. */
export interface MembershipPlanFacts {
  /** 'MONTH' | 'YEAR' — 결제 주기. */
  interval: string
  /** 결제 주기마다 지급되는 복채(만냥). */
  talismansPerPeriod: number
  /** 등록 가능한 인연 수. */
  relationshipLimit: number
  /** 보관 가능한 기록 개수. UNLIMITED_STORAGE_LIMIT 이면 무제한. */
  storageLimit: number
}

/** 결제 주기 표기 — «달마다 지급» / «월 9,900원». */
export function intervalWords(interval: string): { every: string; price: string } {
  return interval === 'YEAR' ? { every: '해', price: '연' } : { every: '달', price: '월' }
}

/**
 * 복채 지급 — «달마다 10만냥». 주기 지급이지 일일 지급이 아니다.
 * 플랜을 모르면 주기를 단정하지 않는다(숫자·주기 모두 생략).
 */
export function bokchaeGrantLine(plan: MembershipPlanFacts | null): string {
  if (!plan) return '복채 — 결제 주기마다 지급'
  return `복채 — ${intervalWords(plan.interval).every}마다 ${plan.talismansPerPeriod}만냥 지급`
}

/**
 * 하루 사용 상한 — 지급과 절대 섞어 쓰지 않는다.
 * 충전한 복채는 이 상한을 받지 않으므로 그 사실까지 함께 적는다.
 */
export function dailySpendCapLine(dailyTalismanLimit: number): string {
  return `지급받은 복채는 하루 ${dailyTalismanLimit}만냥까지 사용 (충전한 복채는 상한 없음)`
}

/**
 * 기록 보관 — 개수 상한이 실재하고 초과분은 자동 정리되므로 «평생»이라 쓰지 않는다.
 * 플랜을 모르면 개수를 단정하지 않는다(등급마다 다르다).
 */
export function recordKeepingLine(plan: MembershipPlanFacts | null): string {
  if (!plan) return '기록 보관 — 기간 제한 없이 (개수는 등급별)'
  if (plan.storageLimit === UNLIMITED_STORAGE_LIMIT) return '기록 보관 — 기간·개수 제한 없이'
  return `기록 보관 — 최대 ${plan.storageLimit}개 · 기간 제한 없이`
}

/** 인연(가족) 등록 — relationship_limit 그대로. */
export function relationshipLine(plan: MembershipPlanFacts | null): string {
  if (!plan) return '가족관리 — 인연 등록·궁합'
  return `가족관리 — 인연 ${plan.relationshipLimit}명 등록·궁합`
}

/**
 * 멤버십이 «여는 것»만 적은 공통 혜택 문구.
 * 멤버십은 문을 열고, 복채는 풀이를 산다 — 회원도 풀이마다 복채를 쓴다(결제 도우미와 같은 결).
 */
export function membershipBenefitLines(plan: MembershipPlanFacts | null): string[] {
  return [
    bokchaeGrantLine(plan),
    '신당 — 신위 모시기·꾸미기 전용 이용',
    relationshipLine(plan),
    '고민상담 — 해화지기와 대화 (멤버십 전용 입장)',
    '웹툰 — 멤버십 전용 회차 열람',
    recordKeepingLine(plan),
  ]
}

/**
 * 플랜 데이터가 없는 화면(게이트 업셀)의 공통 꼬리 문구.
 * 숫자·주기를 단정하지 않으므로 플랜이 바뀌어도 어긋나지 않는다.
 */
export const GENERIC_MEMBERSHIP_BENEFIT_LINES: readonly string[] = [
  '복채 — 결제 주기마다 지급 (풀이는 회원도 복채로 봅니다)',
  '고민상담 · 웹툰 멤버십 회차 입장',
  '기록 보관 — 기간 제한 없이 (개수는 등급별)',
]

/** membership_plans 행(스네이크 케이스) → 혜택 문구용 사실. */
export function toPlanFacts(row: {
  interval: string
  talismans_per_period: number
  relationship_limit: number
  storage_limit: number
}): MembershipPlanFacts {
  return {
    interval: row.interval,
    talismansPerPeriod: row.talismans_per_period,
    relationshipLimit: row.relationship_limit,
    storageLimit: row.storage_limit,
  }
}
