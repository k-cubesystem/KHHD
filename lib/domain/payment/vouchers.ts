/**
 * 이용권(voucher) 카탈로그 · 순수 로직 — v1(선물·1회용 기반 구조).
 *
 * 상품은 voucher_type 추가만으로 늘릴 수 있게 카탈로그로 관리한다.
 * v1 상품은 '고민상담 1일권'(CHAT_DAY_PASS) 1종 — 복채 1만냥, 구매 즉시 24시간 유효.
 * 선물하기(gift)는 v2 — source='gift' + 수신자 지정 컬럼 확장으로 이어갈 수 있게 구조만 남긴다.
 *
 * 순수 함수(side-effect 없음) — 단위테스트 대상.
 */

export type VoucherType = 'CHAT_DAY_PASS'

export interface VoucherProduct {
  type: VoucherType
  label: string
  description: string
  /** 복채 가격(만냥). */
  priceBokchae: number
  /** 유효기간(시간) — 구매 즉시 now + durationHours 만료. */
  durationHours: number
  /** 멤버십에 상시 포함되는지(안내 문구용). */
  includedInMembership: boolean
  /**
   * 지금 팔고 있는 상품인지. false 면 상점에 노출되지 않는다.
   * 카탈로그에서 지우지 않는 이유: user_vouchers 에 이 타입으로 남은 «기존 구매 이력»을
   * 계속 해석해야 하고, VoucherType 유니온이 비면 이용권 계통 전체가 무너진다.
   */
  sellable: boolean
}

export const VOUCHER_CATALOG: Record<VoucherType, VoucherProduct> = {
  CHAT_DAY_PASS: {
    type: 'CHAT_DAY_PASS',
    // 🔴 2026-08-25 판매 중단. 무료 일일분이 0이 되면서 «입장만 여는 권»이 빈 방 열쇠가 됐다
    //    (같은 1만냥이면 질문권 10문을 사는 편이 낫다). 속풀이 유료 진입은 질문권 구매
    //    (shaman-chat.ts purchaseShamanQuestions)로 일원화됐고, 입장 게이트도
    //    «잔여가 1회라도 있으면 통과»로 바뀌었다(app/protected/ai-shaman/page.tsx).
    label: '속풀이 1일권',
    description: '구매 즉시 24시간 동안 신령님과의 속풀이에 들어갈 수 있습니다. (판매 종료)',
    priceBokchae: 1,
    durationHours: 24,
    includedInMembership: true,
    sellable: false,
  },
}

export const VOUCHER_TYPES = Object.keys(VOUCHER_CATALOG) as VoucherType[]

/** 상점에 노출할 상품만. 기존 이력 해석에는 VOUCHER_TYPES 를 그대로 쓴다. */
export const SELLABLE_VOUCHER_TYPES = VOUCHER_TYPES.filter((t) => VOUCHER_CATALOG[t].sellable)

export function getVoucherProduct(type: VoucherType): VoucherProduct {
  return VOUCHER_CATALOG[type]
}

/** 임의 문자열이 유효한 voucher_type 인지(런타임 가드 — 서버 액션 입력 검증). */
export function isVoucherType(value: string): value is VoucherType {
  return Object.prototype.hasOwnProperty.call(VOUCHER_CATALOG, value)
}

/** 만료 시각 = 기준시각(ms) + durationHours. 순수. */
export function computeVoucherExpiry(product: VoucherProduct, fromMs: number): Date {
  return new Date(fromMs + product.durationHours * 3_600_000)
}

/** 활성 여부: status 'active' 이고 만료 전(now 주입 — 순수·테스트 가능). */
export function isVoucherActive(voucher: { status: string; expires_at: string | null }, nowMs: number): boolean {
  if (voucher.status !== 'active') return false
  if (!voucher.expires_at) return false
  return new Date(voucher.expires_at).getTime() > nowMs
}
