/**
 * 회차 접근 규칙 — 무료는 공개 URL, 멤버십은 비공개 버킷 서명 URL.
 *
 * ⚠️ 서명 URL 은 **매번 다른 주소**다(토큰에 발급 시각이 들어간다). 그래서 무료 회차와 값이
 *    다르게 든다 — 이미지 최적화 캐시가 영원히 빗나가고, 주소 하나가 유효기간 내내 열려 있다.
 *    앞엣것은 뷰어가 원본을 그대로 내보내 막고(unoptimized), 뒤엣것을 이 파일이 막는다.
 */

export type EpisodeAccess = 'free' | 'membership'

export function isEpisodeAccess(v: unknown): v is EpisodeAccess {
  return v === 'free' || v === 'membership'
}

/**
 * 모르는 값은 **잠근다**.
 *
 * ⚠️ 반대로 두면(모르면 무료) 열에 오타 하나가 유료 회차를 통째로 공짜로 연다. 잠그는 쪽으로
 *    틀리면 화면에 잠금 안내가 떠서 곧바로 들킨다 — 조용히 새는 것보다 시끄럽게 막히는 게 낫다.
 * ⚠️ 뱃지와 게이트가 **같은 함수**를 쓴다. 판정이 두 곳으로 갈라지면 한쪽만 고쳐진다.
 */
export function toEpisodeAccess(v: unknown): EpisodeAccess {
  return isEpisodeAccess(v) ? v : 'membership'
}

/**
 * 멤버십 회차 서명 URL 유효기간(초).
 *
 * 15분은 한 화를 끝까지 읽는 시간(3~10분)보다 넉넉하면서, 주소를 퍼뜨렸을 때 열려 있는 시간은
 * 한 시간의 4분의 1이다. 늘리려면 "읽다 끊긴다"는 근거가 있어야 한다 — 편해서가 아니라.
 */
export const EPISODE_SIGNED_URL_TTL_SEC = 900
