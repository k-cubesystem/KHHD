/**
 * 신당 2.0 도메인 타입 — 미니룸 배치 / 기운 / 테마 / 아이템 behavior
 * 클라이언트·서버 공용 (순수 타입만, side-effect 없음)
 */

import type { ObangkiMatter } from '@/lib/domain/ritual/obangki'

export type Element = 'wood' | 'fire' | 'earth' | 'metal' | 'water'
export type Layer = 'wall' | 'hanging' | 'altar' | 'floor'
export type SizeGrade = 'sm' | 'md' | 'lg'
export type TapKind = 'toggleLit' | 'swing' | 'smoke'
/**
 * 의식 연출 전용 두 음(2026-09-04): coin = 엽전 짤랑, whoosh = 불붙는·천 펴지는 바람.
 * 살림 아이템 behavior 의 sound 화이트리스트(SOUNDS · scene.ts SOUND_KEYS)에는 넣지 않는다 —
 * 아이템이 낼 소리가 아니라 의식이 내는 소리다.
 */
export type SoundKey = 'moktak' | 'chime' | 'bell' | 'water' | 'crackle' | 'bara' | 'coin' | 'whoosh'
export type EffectKey = 'flame' | 'smoke' | 'petals' | 'ripple' | 'sparkle' | 'resonance'

/** 카탈로그 아이템의 behavior JSONB 스키마 */
export interface ItemBehavior {
  tap?: TapKind
  sound?: SoundKey
  give?: boolean
  litEffect?: EffectKey
}

/** 배치 시 발동하는 기능 해금 (카탈로그 unlock_effect JSONB) */
export interface UnlockEffect {
  /** 효과 종류 (예: chat_retention) */
  type: string
  /** 배치 1개당 연장 일수 */
  days?: number
  /** 효과가 중첩되는 최대 배치 수 */
  maxStack?: number
}

export interface CatalogItem {
  id: string
  name: string
  description: string | null
  type: string
  rarity: string
  emoji: string
  spriteUrl: string | null
  element: Element | null
  energyPower: number
  layer: Layer
  size: SizeGrade
  behavior: ItemBehavior
  priceBok: number
  priceKrw: number
  /** 복채 가격(만냥, 단일 통화). 0=무료. */
  priceBokchae: number
  /** 배치 효험 (없으면 null) */
  unlockEffect: UnlockEffect | null
  /**
   * 어느 기도(문복 갈래)에 좋은가. 빈 배열 = 갈래를 가리지 않는 물건.
   *
   * ⚠️ 값은 `lib/domain/ritual/obangki.ts` 의 ObangkiMatter 와 **같은 문자열**이다 —
   *    DB CHECK 도 같은 목록을 건다. 셋 중 하나만 바뀌면 조용히 어긋난다.
   */
  matters: ObangkiMatter[]
  /** 실제로 어디에 쓰는 물건인가 — 설명이 "효과"라면 이것은 "출처"다 */
  originNote: string | null
}

/** 방에 배치된 아이템 인스턴스 */
export interface Placement {
  id: string
  catalogItemId: string
  layer: Layer
  x: number
  y: number
  flip: boolean
  state: PlacementState
}
export interface PlacementState {
  lit?: boolean
}

export interface InventoryEntry {
  catalogItemId: string
  qty: number
}

export interface ThemeAssets {
  wall?: string
  floor?: string
  accent?: string
  particle?: string
  glow?: string
  top?: string
}
export interface ThemePack {
  id: string
  code: string
  name: string
  priceBok: number
  priceKrw: number
  /** 복채 가격(만냥, 단일 통화). 0=무료. */
  priceBokchae: number
  elementAffinity: Element | null
  assets: ThemeAssets
  owned: boolean
  /** 이 자리가 어떤 곳인가 — 두 문장 스토리 (없으면 구 데이터) */
  story: string | null
  /** 어떤 사주에 맞는 자리인가 — 한 문장 */
  sajuNote: string | null
  /** 궁합이 맞는 신위 (shrine_deities.code, 최대 2) */
  deityCodes: string[]
  /** 이 자리에서 올리기 좋은 기도 — 오방기 문복 갈래와 같은 문자열 */
  matters: ObangkiMatter[]
}

export interface EnergyProfile {
  base: Record<Element, number>
  yongsin: Element | null
}

/** 페이지 초기 로드에 필요한 전체 씬 데이터 */
export interface MainDeity {
  code: string
  name: string
  spriteUrl: string | null
  /** 초상(제단·신당지기 오브용). 없으면 🔮 폴백 */
  portraitUrl: string | null
  /** 시그니처 이펙트 키 (§3.3, 예: seed_bloom). 방에 상시 방출. */
  particle: string | null
  /** 신위 액센트 색 (파티클·글로우 색상) */
  accent: string | null
  /** 시그니처 사운드 키 (탭 반응용) */
  sound: SoundKey | null
  /** 소유자의 누적 인연(緣) 포인트. null = 방문자 뷰(비공개 — RLS로 조회 불가, 오표시 방지) */
  bondPoints: number | null
}

export interface SceneData {
  shrineId: string
  shrineName: string
  /** 착좌한 신수(神獸) 슬러그 (최대 2 — 도메인 parseGuardianSlugs 가 걸러 준다) */
  guardians: string[]
  /** 이 신당의 점사 대상 가족 (null=본인 신당) */
  familyMemberId: string | null
  /** 놋방울(deity_greeting) 배치 시 主神이 부를 이름. 미배치면 null */
  greetingName: string | null
  /** 공개 여부 — 가족 신당은 기본 비공개(opt-in 공개) */
  visibility: 'public' | 'private'
  isOwner: boolean
  catalog: CatalogItem[]
  placements: Placement[]
  inventory: InventoryEntry[]
  profile: EnergyProfile
  themes: ThemePack[]
  activePackCode: string
  visitorCount: number
  wishCount: number
  mainDeity: MainDeity | null
}

// ─── 파싱 가드 (Supabase JSONB → 타입 안전) ──────────────────

const ELEMENTS: readonly Element[] = ['wood', 'fire', 'earth', 'metal', 'water']
const LAYERS: readonly Layer[] = ['wall', 'hanging', 'altar', 'floor']
const TAPS: readonly TapKind[] = ['toggleLit', 'swing', 'smoke']
const SOUNDS: readonly SoundKey[] = ['moktak', 'chime', 'bell', 'water', 'crackle', 'bara']

export function isElement(v: unknown): v is Element {
  return typeof v === 'string' && (ELEMENTS as readonly string[]).includes(v)
}
export function isLayer(v: unknown): v is Layer {
  return typeof v === 'string' && (LAYERS as readonly string[]).includes(v)
}

/** DB behavior JSONB(unknown)를 안전하게 ItemBehavior로 변환 */
export function parseBehavior(raw: unknown): ItemBehavior {
  if (typeof raw !== 'object' || raw === null) return {}
  const r = raw as Record<string, unknown>
  const out: ItemBehavior = {}
  if (typeof r.tap === 'string' && (TAPS as readonly string[]).includes(r.tap)) out.tap = r.tap as TapKind
  if (typeof r.sound === 'string' && (SOUNDS as readonly string[]).includes(r.sound)) out.sound = r.sound as SoundKey
  if (r.give === true) out.give = true
  if (r.litEffect === 'flame') out.litEffect = 'flame'
  return out
}

/** DB state JSONB(unknown)를 PlacementState로 변환 */
export function parsePlacementState(raw: unknown): PlacementState {
  if (typeof raw !== 'object' || raw === null) return {}
  const r = raw as Record<string, unknown>
  return { lit: r.lit === true }
}

/** DB unlock_effect JSONB(unknown)를 UnlockEffect로 변환 */
export function parseUnlockEffect(raw: unknown): UnlockEffect | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  if (typeof r.type !== 'string' || r.type.length === 0) return null
  const out: UnlockEffect = { type: r.type }
  if (typeof r.days === 'number' && Number.isFinite(r.days)) out.days = r.days
  if (typeof r.max_stack === 'number' && Number.isFinite(r.max_stack)) out.maxStack = r.max_stack
  return out
}
