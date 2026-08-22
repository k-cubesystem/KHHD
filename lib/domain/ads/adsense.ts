/**
 * 구글 애드센스 — 게재 자리와 정책 경계의 **단일 출처**(순수 상수·판정).
 *
 * ## 🔴 보상과 절대 엮지 말 것
 * 애드센스는 «광고를 보거나 클릭한 대가로 보상 제공»을 금지한다(계정 폐쇄 사유 상위권).
 * 이 프로젝트에는 보상형 흐름이 둘 있다 —
 *   ① 복 배경화면 「광고 보고 오늘 1장 열기」(하우스 광고)
 *   ② 속풀이 「광고 보고 향 올리기」(쿠팡 방문형)
 * **그 둘에 이 모듈을 연결하면 안 된다.** 여기 광고는 «보고만 가는» 일반 디스플레이 광고다.
 * 보상형으로 가려면 별도 상품(H5 Games Ads)의 승인을 먼저 받아야 하고, 그때도 보상은
 * 비금전이어야 한다. 승인 전에 이 자리를 보상에 물리는 순간 계정이 날아간다.
 *
 * ## 🔴 프로덕션에서만 그린다
 * 개발·프리뷰에서 우리가 띄우고 누른 노출/클릭은 **무효 트래픽**으로 잡혀 계정 위험이 된다.
 * `shouldRenderAds` 가 프로덕션이 아닌 곳에서 광고를 통째로 끈다.
 */

/** 발행자 ID — 공개 식별자다(HTML 에 그대로 실린다). 비밀 아님. */
export const ADSENSE_CLIENT = 'ca-pub-5973795407934214'

/** 광고 자리 이름 — 화면이 이 키로 자리를 고른다. */
export type AdSlotName = 'wallpaper'

/**
 * 자리별 슬롯 ID. 애드센스 콘솔에서 «광고 단위»를 만들면 나오는 숫자열이며 **공개값**이다.
 * 🔴 빈 문자열이면 그 자리는 아예 렌더하지 않는다 — 빈 회색 상자를 화면에 남기지 않기 위함.
 *    CEO 가 단위를 만들어 ID 를 주면 여기만 채우면 켜진다.
 */
export const ADSENSE_SLOTS: Record<AdSlotName, string> = {
  wallpaper: '',
}

/** 그 자리에 실제로 게재할 ID 가 준비됐는가. */
export function isAdSlotConfigured(slot: AdSlotName): boolean {
  return ADSENSE_SLOTS[slot].trim().length > 0
}

/** 광고를 하나라도 게재하는가 — 스크립트 로드 여부를 이 값으로 정한다. */
export function hasAnyAdSlot(): boolean {
  return (Object.keys(ADSENSE_SLOTS) as AdSlotName[]).some(isAdSlotConfigured)
}

/**
 * 지금 환경에서 광고를 그려도 되는가.
 * 프로덕션 + 게재할 슬롯이 있을 때만 참. (무효 트래픽 방지 — 위 주석 참고)
 */
export function shouldRenderAds(nodeEnv: string | undefined, slot: AdSlotName): boolean {
  return nodeEnv === 'production' && isAdSlotConfigured(slot)
}
