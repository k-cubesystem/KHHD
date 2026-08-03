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

/** 등급별 버킷. 무료는 공개, 멤버십은 비공개 — 이 짝이 어긋나면 게이트가 통째로 무의미해진다. */
export function episodeBucket(access: EpisodeAccess): 'webtoon' | 'webtoon-locked' {
  return access === 'membership' ? 'webtoon-locked' : 'webtoon'
}

// ─── 운영 (회차 등록) ────────────────────────────────────────

export const EPISODE_TITLE_MIN = 2
export const EPISODE_TITLE_MAX = 80
export const EPISODE_SUMMARY_MAX = 300
/** 한 화 컷 상한. 넘길 일이 있으면 화를 나누는 게 맞다(스크롤도, 발급도 감당이 안 된다). */
export const EPISODE_PAGE_MAX = 80

/**
 * 컷 이미지 가로 상한(px).
 *
 * ⚠️ 멤버십 회차는 이미지 최적화를 타지 않는다(서명 주소라 캐시가 안 맞는다) — **여기서 줄이지
 *    않으면 원본이 그대로 독자에게 간다**. 공통 압축 유틸(compress-image)은 *긴 변*을 1280 으로
 *    맞추는데, 세로로 긴 웹툰 컷에 그걸 쓰면 가로가 256px 로 뭉개진다. 웹툰은 가로를 잡아야 한다.
 */
export const EPISODE_CUT_MAX_WIDTH = 1080
export const EPISODE_CUT_QUALITY = 0.82

/**
 * 컷의 스토리지 경로.
 *
 * ⚠️ 회차·순번으로 **결정되는** 이름이다. 무작위 이름을 쓰면 다시 올릴 때마다 옛 파일이 버킷에
 *    쌓이고, 어느 것이 지금 쓰이는지 아무도 모르게 된다. 같은 자리에 덮어쓴다.
 */
export function episodeCutPath(no: number, idx: number): string {
  return `ep-${String(Math.max(0, Math.floor(no))).padStart(3, '0')}/${String(Math.max(0, Math.floor(idx))).padStart(3, '0')}.jpg`
}

export interface EpisodeDraft {
  readonly no: number
  readonly title: string
  readonly summary: string
  readonly access: EpisodeAccess
  /** 빈 문자열이면 미공개(초안) — 목록에도 뷰어에도 뜨지 않는다 */
  readonly publishedAt: string
}

export interface EpisodeIssue {
  readonly field: 'no' | 'title' | 'summary' | 'access'
  readonly message: string
}

export function validateEpisode(draft: EpisodeDraft): readonly EpisodeIssue[] {
  const out: EpisodeIssue[] = []

  // 0 = 예고편. 음수와 소수는 회차 번호가 아니다.
  if (!Number.isInteger(draft.no) || draft.no < 0) out.push({ field: 'no', message: '회차 번호는 0 이상의 정수입니다' })

  const title = draft.title.trim()
  if (title.length < EPISODE_TITLE_MIN) out.push({ field: 'title', message: '제목을 지어 주세요' })
  else if (title.length > EPISODE_TITLE_MAX)
    out.push({ field: 'title', message: `제목은 ${EPISODE_TITLE_MAX}자까지입니다` })

  if (draft.summary.trim().length > EPISODE_SUMMARY_MAX)
    out.push({ field: 'summary', message: `줄거리는 ${EPISODE_SUMMARY_MAX}자까지입니다` })

  if (!isEpisodeAccess(draft.access)) out.push({ field: 'access', message: '접근 등급이 올바르지 않습니다' })

  return Object.freeze(out)
}

export function isEpisodeValid(draft: EpisodeDraft): boolean {
  return validateEpisode(draft).length === 0
}
