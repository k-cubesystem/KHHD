/**
 * 미리보기 장면(scene) 표 — 「클로드코드 프리뷰」의 단일 출처.
 *
 * 왜 있나: 화면 변경을 «배포 → 폰으로 확인 → 반려» 로 돌리면 눈으로 5초에 잡히는 문제
 * (글씨가 안 보인다·위치가 하단이다·두 버튼이 헷갈린다)를 프로덕션 배포 뒤에야 알게 된다.
 * 로그인·DB 없이 목 데이터로 상태를 세워 두고 로컬에서 찍어 그림으로 먼저 보이려는 것이다.
 *
 * 이 모듈은 **순수**하다(React·서버 의존 없음) — 표만 산다. 실제 렌더는
 * `app/dev-preview/scene-views.tsx` 의 표(Record<PreviewSceneId, …>)가 지고,
 * 타입이 두 표의 키를 강제로 맞춘다(장면을 여기 한 줄 더하면 그쪽이 컴파일 에러로 요구한다).
 *
 * 🔴 프로덕션 노출 금지 — 라우트는 `isPreviewEnabled` 가 false 면 notFound() 한다.
 */

/** 화면 묶음 — 목록 페이지의 소제목이자 촬영 순서. */
export type PreviewSceneGroup = '복주머니' | '복 배경화면' | '종합사주풀이'

export interface PreviewScene {
  /** URL·PNG 파일명이 되는 식별자. 소문자·숫자·하이픈만(아래 패턴). */
  id: string
  /** 목록에 적히는 한국어 이름. */
  label: string
  group: PreviewSceneGroup
  /** «이 장면이 무엇을 보여주는가» 한 줄 — 목록과 촬영본 머리글에 같이 나온다. */
  note: string
}

/**
 * 장면 id 규칙 — URL 세그먼트이자 PNG 파일명이라 둘 다에서 안전한 글자만 쓴다.
 * (Windows 파일명 금칙문자·대소문자 혼동·공백을 원천 배제)
 */
export const PREVIEW_SCENE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * `/dev-preview` 아래에서 장면이 아닌 고정 세그먼트 — 같은 이름의 장면 id 는 라우팅에 가려 죽는다.
 * (Next 는 정적 세그먼트를 동적 `[scene]` 보다 먼저 잡는다)
 */
export const PREVIEW_RESERVED_SEGMENTS: readonly string[] = ['manifest']

/**
 * 장면 표 — **장면 추가는 여기 한 줄**이 전부다.
 * 한 줄 더하면 `scene-views.tsx` 의 렌더 표가 타입으로 그 키를 요구하고, 촬영 스크립트는
 * `/dev-preview/manifest` 로 이 표를 그대로 읽으므로 따로 손댈 곳이 없다.
 */
export const PREVIEW_SCENES = [
  {
    id: 'journey-empty',
    label: '복주머니 — 아직 빈 주머니',
    group: '복주머니',
    note: '풀이 이력 0건. 첫 주머니(사주)가 현재 단계로 뛴다',
  },
  {
    id: 'journey-progress',
    label: '복주머니 — 둘 채움',
    group: '복주머니',
    note: '사주·관상 완료. 손금이 현재 단계, 종합은 잠김',
  },
  {
    id: 'journey-complete-unclaimed',
    label: '복주머니 — 완주·보상 미수령',
    group: '복주머니',
    note: '다섯 모두 완료. CTA 가 「가득 찬 복 받기」로 바뀌는 자리',
  },
  {
    id: 'journey-claimed',
    label: '복주머니 — 완주·보상 수령함',
    group: '복주머니',
    note: '봉안 완료 문구 + CTA 가 「다시 보기」로 돌아온 상태',
  },
  {
    id: 'wallpaper-free',
    label: '배경화면 — 자격 없음',
    group: '복 배경화면',
    note: '무료 1장만 열림. 나머지는 소장·광고 두 버튼',
  },
  {
    id: 'wallpaper-member',
    label: '배경화면 — 멤버십',
    group: '복 배경화면',
    note: '멤버십 배너 + 여섯 장 전부 열림(구매 버튼 없음)',
  },
  {
    id: 'wallpaper-ad-used',
    label: '배경화면 — 오늘 광고 소진',
    group: '복 배경화면',
    note: '「광고 보고 오늘 1장 열기」 버튼이 사라진 상태',
  },
  {
    id: 'wallpaper-purchased',
    label: '배경화면 — 두 장 소장함',
    group: '복 배경화면',
    note: '구매·광고로 연 장에 출처 라벨이 붙는다',
  },
  {
    id: 'samhap-intro',
    label: '종합사주풀이 — 소개 카드',
    group: '종합사주풀이',
    note: '앰비언트 영상 위 글씨 가독(CEO 「글이 안 보여」 지점)',
  },
] as const satisfies readonly PreviewScene[]

/** 표의 한 줄 — id 가 리터럴로 좁혀져 있어 렌더 표를 그대로 색인할 수 있다. */
export type PreviewSceneEntry = (typeof PREVIEW_SCENES)[number]

/** 표에서 뽑은 장면 id 합집합 — 렌더 표가 이 키를 전부 채우도록 강제하는 데 쓴다. */
export type PreviewSceneId = PreviewSceneEntry['id']

/** 촬영 뷰포트 — 모바일이 이 서비스의 본진이라 기본이자 첫 번째다. */
export const PREVIEW_VIEWPORTS = {
  mobile: { width: 375, height: 812 },
  desktop: { width: 1280, height: 800 },
} as const

export type PreviewViewportName = keyof typeof PREVIEW_VIEWPORTS

/**
 * 프로덕션에서는 미리보기가 존재하지 않아야 한다 — 실수로 배포돼도 고객 노출 0.
 * 라우트가 이 판정으로 notFound() 한다. 순수 함수라 테스트가 직접 잡는다.
 */
export function isPreviewEnabled(nodeEnv: string | undefined): boolean {
  return nodeEnv !== 'production'
}

export function isPreviewSceneId(id: string): id is PreviewSceneId {
  return PREVIEW_SCENES.some((s) => s.id === id)
}

/** 알 수 없는 id 면 null — 라우트는 이걸 notFound() 로 바꾼다. */
export function findPreviewScene(id: string): PreviewSceneEntry | null {
  return PREVIEW_SCENES.find((s) => s.id === id) ?? null
}

export function previewScenePath(id: string): string {
  return `/dev-preview/${id}`
}

/** 촬영 산출물 이름 — `preview-shots/{scene}-{viewport}.png`. */
export function previewShotFileName(id: string, viewport: PreviewViewportName): string {
  return `${id}-${viewport}.png`
}
