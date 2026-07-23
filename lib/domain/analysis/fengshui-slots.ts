/**
 * 풍수 다중 사진 슬롯 정의 — 순수 상수/로직 모듈(side-effect 없음, 단위테스트 대상).
 *
 * "한 장으로 집 전체 풍수는 말이 안 된다" — 분석 대상(집/사업장/외관)별로 무엇을 어디서
 * 찍어야 하는지를 라벨된 슬롯으로 안내한다. 각 슬롯은 사진 1장을 담으며(1슬롯 1사진),
 * 채워진 슬롯의 라벨만 서버로 전송되어 Gemini 멀티파트 프롬프트의 "사진N=라벨" 매핑이 된다.
 *
 * 불변식: 각 스펙의 max === slots.length (1슬롯 1사진), min <= max, id 유일.
 */

export type FengshuiSubjectType = 'interior' | 'exterior' | 'office'

export interface FengshuiSlot {
  /** 영문 안정 식별자 — React 상태 키·전송 순서 안정용(라벨 변경에도 불변). */
  id: string
  /** 한글 노출 라벨 — UI 표시 + Gemini "사진N=라벨" 매핑에 그대로 사용. */
  label: string
  /** 권장(핵심) 슬롯 여부 — UI에서 먼저·강조 노출. 선택 슬롯은 보조. */
  recommended: boolean
}

export interface FengshuiSlotSpec {
  subjectType: FengshuiSubjectType
  /** 분석에 필요한 최소 사진 수. */
  min: number
  /** 허용 최대 사진 수(= slots.length). */
  max: number
  slots: FengshuiSlot[]
  /** roomType 하위호환용 대표 슬롯명(첫 권장 슬롯 라벨). */
  primaryLabel: string
}

/** 총 업로드 용량 가드 — 합산 3.5MB 초과 시 안내(압축 경유 시 사실상 도달 불가). */
export const MAX_TOTAL_UPLOAD_BYTES = Math.round(3.5 * 1024 * 1024)

const INTERIOR_SLOTS: FengshuiSlot[] = [
  { id: 'entrance', label: '현관', recommended: true },
  { id: 'livingroom', label: '거실', recommended: true },
  { id: 'master_bedroom', label: '안방', recommended: true },
  { id: 'kitchen', label: '주방', recommended: true },
  { id: 'small_room', label: '작은방', recommended: false },
  { id: 'small_room_2', label: '작은방2', recommended: false },
]

const OFFICE_SLOTS: FengshuiSlot[] = [
  { id: 'building_entrance', label: '건물입구', recommended: true },
  { id: 'hall', label: '홀·매장', recommended: true },
  { id: 'counter', label: '사무실·카운터', recommended: true },
  { id: 'inner_extra', label: '내부 추가(창고 등)', recommended: false },
  { id: 'extra_space', label: '추가 공간', recommended: false },
  { id: 'extra_space_2', label: '추가 공간2', recommended: false },
]

const EXTERIOR_SLOTS: FengshuiSlot[] = [
  { id: 'facade', label: '건물 정면', recommended: true },
  { id: 'gate', label: '대문·입구', recommended: true },
  { id: 'surroundings', label: '주변 환경', recommended: false },
]

/** 대상별 슬롯 스펙 — min/max 는 발주 정의를 그대로 따른다(interior·office 1~6, exterior 1~3). */
export const SUBJECT_SLOT_SPECS: Record<FengshuiSubjectType, FengshuiSlotSpec> = {
  interior: {
    subjectType: 'interior',
    min: 1,
    max: 6,
    slots: INTERIOR_SLOTS,
    primaryLabel: INTERIOR_SLOTS[0]!.label,
  },
  office: {
    subjectType: 'office',
    min: 1,
    max: 6,
    slots: OFFICE_SLOTS,
    primaryLabel: OFFICE_SLOTS[0]!.label,
  },
  exterior: {
    subjectType: 'exterior',
    min: 1,
    max: 3,
    slots: EXTERIOR_SLOTS,
    primaryLabel: EXTERIOR_SLOTS[0]!.label,
  },
}

/** 대상 타입 → 슬롯 스펙. */
export function getSlotSpec(subjectType: FengshuiSubjectType): FengshuiSlotSpec {
  return SUBJECT_SLOT_SPECS[subjectType]
}

/** 여러 base64(바이트) 합산. */
export function sumBytes(bytesList: number[]): number {
  return bytesList.reduce((acc, n) => acc + (Number.isFinite(n) && n > 0 ? n : 0), 0)
}

/** 총 용량이 업로드 가드 이내인지. */
export function isWithinUploadBudget(bytesList: number[]): boolean {
  return sumBytes(bytesList) <= MAX_TOTAL_UPLOAD_BYTES
}

/** 채워진 사진 수가 분석 최소치를 만족하는지. */
export function meetsMinimum(filledCount: number, spec: FengshuiSlotSpec): boolean {
  return filledCount >= spec.min
}
