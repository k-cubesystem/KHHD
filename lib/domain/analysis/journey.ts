/**
 * 종합사주풀이 여정(Journey) 순수 로직.
 *
 * 사주(SAJU) → 관상(FACE) → 손금(HAND) → 풍수(FENGSHUI) → 종합(SAMHAP) 의
 * 단계별 상태·다음 단계·전체 진행률을 `completedCategories` 로부터 계산한다.
 * 종합(SAMHAP)은 개인 4상(SAJU·FACE·HAND·FENGSHUI)이 모두 완료돼야 해금된다.
 *
 * side-effect 없음(순수 함수) — 단위테스트 대상. 아이콘·모션 등 표현은 컴포넌트가 입힌다.
 */

export type JourneyStageId = 'SAJU' | 'FACE' | 'HAND' | 'FENGSHUI' | 'SAMHAP'

/** done=완료(체크) · current=지금 할 단계(글로우) · todo=미완료 접근가능 · locked=잠김(자물쇠). */
export type JourneyStageStatus = 'done' | 'current' | 'todo' | 'locked'

export interface JourneyStage {
  id: JourneyStageId
  label: string
  subtitle: string
  /** 대상(target) 쿼리가 붙은 이동 경로. */
  href: string
  status: JourneyStageStatus
  /** 종합(SAMHAP) 단계 여부 — UI 강조·해금 처리용. */
  isFinal: boolean
}

export interface JourneyProgress {
  stages: JourneyStage[]
  /** 0~100 정수 진행률(완료 단계 수 / 5). */
  progress: number
  /** 다음 실행 단계. 전부 완료면 undefined. */
  next?: JourneyStage
  /** 개인 4상(SAJU·FACE·HAND·FENGSHUI) 모두 완료 → 종합 해금. */
  coreComplete: boolean
  /** 5단계 전부 완료. */
  allComplete: boolean
}

/** 개인 4상 — 종합(SAMHAP) 해금 요건(순서 = 여정 순서). */
export const JOURNEY_CORE_STAGES: readonly JourneyStageId[] = ['SAJU', 'FACE', 'HAND', 'FENGSHUI']

/** 여정 전체 순서(종합 포함). */
export const JOURNEY_STAGE_ORDER: readonly JourneyStageId[] = ['SAJU', 'FACE', 'HAND', 'FENGSHUI', 'SAMHAP']

const STAGE_META: Record<JourneyStageId, { label: string; subtitle: string; path: string }> = {
  SAJU: { label: '사주', subtitle: '타고난 운명', path: '/protected/analysis/cheonjiin' },
  FACE: { label: '관상', subtitle: '얼굴의 상', path: '/protected/studio/face' },
  HAND: { label: '손금', subtitle: '손안의 상', path: '/protected/studio/palm' },
  FENGSHUI: { label: '풍수', subtitle: '터의 기운', path: '/protected/studio/fengshui' },
  SAMHAP: { label: '종합', subtitle: '종합사주풀이', path: '/protected/studio/samhap' },
}

/**
 * 대상(target) 쿼리를 부여한다.
 * 여정 5개 목적지(cheonjiin·face·palm·fengshui·samhap)는 모두 `target` 파라미터를 읽는다.
 * (cheonjiin 은 target·targetId 를 병행 수용하므로 `target` 로 통일해도 안전.)
 */
function withTarget(path: string, targetId?: string): string {
  return targetId ? `${path}?target=${targetId}` : path
}

/**
 * completedCategories(analysis_history DISTINCT category) → 여정 진행 상태.
 * @param completedCategories 완료 카테고리 문자열 배열(중복·이물질 허용 — 내부에서 Set 처리).
 * @param targetId 가족 대상 id(본인이면 생략).
 */
export function buildJourney(completedCategories: readonly string[], targetId?: string): JourneyProgress {
  const done = new Set(completedCategories)
  const coreComplete = JOURNEY_CORE_STAGES.every((c) => done.has(c))
  const samhapDone = done.has('SAMHAP')
  const allComplete = coreComplete && samhapDone

  // 다음 실행 단계: 미완료 개인 4상 중 순서상 첫 단계 → 없으면(4상 완료) 종합 → 종합까지 끝났으면 undefined.
  const firstUndoneCore = JOURNEY_CORE_STAGES.find((c) => !done.has(c))
  const nextId: JourneyStageId | undefined = firstUndoneCore ?? (samhapDone ? undefined : 'SAMHAP')

  const stages: JourneyStage[] = JOURNEY_STAGE_ORDER.map((id) => {
    const meta = STAGE_META[id]
    const isFinal = id === 'SAMHAP'
    let status: JourneyStageStatus
    if (done.has(id)) status = 'done'
    else if (isFinal && !coreComplete) status = 'locked'
    else if (id === nextId) status = 'current'
    else status = 'todo'
    return {
      id,
      label: meta.label,
      subtitle: meta.subtitle,
      href: withTarget(meta.path, targetId),
      status,
      isFinal,
    }
  })

  const doneCount = JOURNEY_STAGE_ORDER.filter((id) => done.has(id)).length
  const progress = Math.round((doneCount / JOURNEY_STAGE_ORDER.length) * 100)
  const next = nextId ? stages.find((s) => s.id === nextId) : undefined

  return { stages, progress, next, coreComplete, allComplete }
}
