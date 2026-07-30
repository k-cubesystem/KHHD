'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as RPointerEvent,
} from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Volume2, VolumeX, Wrench, Check, Settings, Sparkles, Lock } from 'lucide-react'
import type { Element, Layer, ThemePack } from '@/lib/domain/shrine/types'
import { computeEnergy, ELEMENTS, EL_KO, EL_COLOR } from '@/lib/domain/shrine/energy'
import { bondProgress, deityTurnFrames, BOND_LEVEL_NAMES, BOND_THRESHOLDS } from '@/lib/domain/shrine/deities'
import { ZONES, clampPct, initialSpot, KEEPER_POS, KEEPER_GIVE_RADIUS, ZONE_LABEL } from '@/lib/domain/shrine/zones'
import {
  depthScale,
  depthZ,
  groundShadow,
  litBoost,
  lightingOverlayStyle,
  nearestAnchor,
  DEFAULT_ANCHORS,
  type StageAnchor,
  type StageCatalogItem,
  type StageLight,
  type StagePlacement,
  type StageSceneData,
} from '@/lib/domain/shrine/stage'
import { kstHour, sceneLight } from '@/lib/domain/shrine/scene-clock'
import { effectsTier, type EffectsTier } from '@/lib/domain/shrine/perf-gate'
import { PARALLAX, WORLD_VIEWPORT_PCT, daecheongZone, parseWorld, zoneAlignCamX } from '@/lib/domain/shrine/world'
import { parallaxShiftPct, zoneBox, zoneCodeAt, zoneStage, zoneWidthScale } from '@/lib/domain/shrine/world-render'
import {
  entranceMsFor,
  keeperRestX,
  planKeeperWalk,
  type KeeperEntranceSpec,
  type KeeperRange,
} from '@/lib/domain/shrine/keeper-walk'
import { GAMEFEEL_V1, SCROLL_SHRINE_V1, SHRINE_PRAYED_EVENT } from '@/lib/config/gamefeel'
import {
  greetingFor,
  personalGreeting,
  litLine,
  tapLine,
  giveLine,
  keeperTapLine,
  resonanceLine,
  idleLine,
  anchorLine,
  prayerLine,
  KEEPER_SNEEZE,
  KEEPER_TAP_LIMIT,
} from './keeper-lines'
import { useCinematics, motionAllowed, ENTRANCE_MS } from './useCinematics'
import { CameraMinimap, useCameraRig } from './CameraRig'
import { useShrineAudio } from './useShrineAudio'
import { AmbientVideo } from '@/components/shared/AmbientVideo'
import { EffectsCanvas, type EffectsHandle } from './EffectsCanvas'
import { WalkingKeeper, type KeeperSpot } from './WalkingKeeper'
import { DeityTurn } from './DeityTurn'
import { StageLayers } from './StageLayers'
import { ShrineGuideBar } from './ShrineGuideBar'
import { DevotionStrip } from './DevotionStrip'
import { FamilyHall } from './FamilyHall'
import type { FamilyHallData } from '@/app/actions/shrine/family-hall'
import { saveShrineLayout, activateThemePack, setPlacementLit, setShrineVisibility } from '@/app/actions/shrine/scene'
import { purchaseThemePack } from '@/app/actions/shrine/deities'
import { recordKeeperGift } from '@/app/actions/shrine/keeper'
import { getRoomOracle, markOracleSeen } from '@/app/actions/shrine/oracle'
import type { DevotionStatus } from '@/app/actions/shrine/devotion'
import { devotionLevelForTheme } from '@/lib/domain/shrine/devotion'
import { trackEvent } from '@/lib/analytics/ga4'
// 씬 전체(idle·탭·카메라·신당지기·사랑방·무대)의 연출 CSS. 룸이 유일한 진입점이라 여기서 한 번만 싣는다.
// ⚠️ styled-jsx 로 되돌리지 말 것 — App Router 에서는 산출물에 실리지 않는다(app/shrine-scene.css 머리말).
import '@/app/shrine-scene.css'

/** 촛불 불꽃은 아이템 상단에서 피어오르도록 y를 살짝 위로 */
const FLAME_Y_OFFSET = 5

/**
 * 좌정 主神 몸통 — 시그니처 aura 방출·탭 버스트 기준점.
 *
 * 42 → **39**: 신위 접지가 단상 상면(y45.3)으로 올라가 스탠드가 y12~45.3 이 되었다. 42 를 그대로 두면
 * 아우라가 발끝 3.3%p 위에서 터져 "옷자락에서 나는 빛"이 된다 — 접지에서 스탠드 높이의 20% 위
 * (=몸통 아래쪽, 종전과 같은 몸의 위치)로 옮겼다. stage.PODIUM_TOP_Y 가 바뀌면 이 값도 같이 본다.
 */
const DEITY_POS = { x: 50, y: 39 } as const
/** 기도 절정의 반짝임 — 제단 상판(단상 앞 공물상 y49~67, 상면 앞턱 y57)의 상면 위 */
const PRAYER_SPARKLE_POS = { x: 50, y: 52 } as const
/** 낮밤 광원 갱신 주기. 위상 전이는 ±1h 에 걸쳐 있어 분 단위면 충분하다. */
const SCENE_CLOCK_MS = 60_000
/** 향로 상시 연기 — 방출 주기와 동시 개수 상한(ARCH §5 상시 이미터 3개 상한) */
const SMOKE_INTERVAL_MS = 2600
const SMOKE_MAX = 3
/** 입장 시네마틱 1회성 판정 — 탭 세션 동안만 유지(새 탭은 다시 첫 진입) */
const ENTRANCE_SEEN_KEY = 'shrine_gamefeel_seen'
/** 탭 반응 클래스 — 게이트 오프면 v2 흔들림으로 되돌아간다 */
const TAP_CLASS = GAMEFEEL_V1 ? 'shrine-tap-squash' : 'shrine-item-wiggle'
/** 층별 상시 idle — 걸이 살랑·벽걸이 미세 살랑·바닥/제단 미세 숨쉬기.
    전 층을 덮어야 "가만히 있어도 산다"가 신당 구성과 무관하게 성립한다(안1.1 체감 강화). */
const IDLE_CLASS: Record<Layer, string> = {
  hanging: 'shrine-idle-sway',
  wall: 'shrine-idle-wallsway',
  altar: 'shrine-idle-breathe',
  floor: 'shrine-idle-breathe',
}
// ── 거니는 신당지기 (안2.2 / PRD 부록 B) ──────────────────────
/**
 * 배회 구간(대청 구역 로컬 %) — 큰 방에서만 쓰인다.
 *
 * 중점이 곧 정지 위치·입장 도착점이라(keeper-walk 계약) **중점을 제단 옆(45)에 맞춘 구간**을 쓴다.
 * 부록 B 초안의 22~78 은 중점이 50(제단 정면)이라 신위와 겹치고 입장 도착점(45)과도 어긋나
 * 승계 순간 순간이동이 생긴다 — 중점 45 를 유지한 채 폭만 좁혔다.
 * 28%p(≈0.9화면)로 잡은 이유: 320% 방에서 46%p 는 1.5화면이라 카메라가 멎어 있으면 신당지기가
 * 주기적으로 화면을 벗어난다. 걷는 모습이 보이는 것이 이 프로토타입의 목적이라 폭을 양보했다
 * (방을 더 쓰려면 여기만 넓히면 되고 다른 코드는 손댈 필요가 없다).
 */
const KEEPER_WANDER: KeeperRange = { from: 31, to: 59 }
/** 입장 걷기 시작점 — 문간(부록 B 방 구성 x≈8) */
const KEEPER_ENTRANCE_FROM = 8
/**
 * 입장 걷기 길이는 **상수가 아니다** — `entranceMsFor(from, plan)` 가 배회 속도에서 파생한다.
 * 1800 → 3600(3차) → 파생(4차). 상수로 두는 한 배회 상수와 따로 조정돼 다시 어긋난다.
 * 현재 구성(37%p 이동 · 배회 28%p/30s · 4배)에서 ≈9.9s 이고, 카메라 팬(ENTRANCE_MS.pan=1100)의
 * 9배라 "카메라가 먼저 대청에 서고 신당지기가 뒤따라 들어온다"는 원래 의도는 그대로다.
 */
/** 탭 후 걸음 멈춤 길이 — 말풍선을 읽을 만큼만(부록 B 2.5s) */
const KEEPER_TAP_PAUSE_MS = 2500

/** 상시 빛가루 — 배치가 빈약한 신당에서도 보이는 최소 상시 모션. 광원 타원 주변을 순환한다 */
const MOTE_INTERVAL_MS = 6500
const MOTE_SPOTS = [
  { x: 38, y: 63 },
  { x: 63, y: 57 },
  { x: 50, y: 47 },
] as const

/** CSS 사용자 정의 속성은 CSSProperties 에 없다 — 교차 타입으로 좁혀 any 를 피한다. */
type CssVars = CSSProperties & Record<`--${string}`, string>

// ── 두루마리 시차층 (안2 / ARCH §1 렌더 스택) ────────────────
/**
 * 시차 이동은 CSS 가 계산한다 — JS 가 매 프레임 만지는 값은 CameraRig 가 발행하는 `--shrine-cam-x` 하나뿐이고,
 * 층별 계수(`--shrine-par-*`)는 테마(=world 폭)당 1회만 정해진다. 리플로우 0·컴포지터 전용.
 */
const FAR_TRANSFORM = 'translate3d(calc(var(--shrine-cam-x) * var(--shrine-par-far)), 0, 0)'
const NEAR_TRANSFORM = 'translate3d(calc(var(--shrine-cam-x) * var(--shrine-par-near)), 0, 0)'
/** 원경 — 위가 짙은 밤하늘 + 기와 능선을 흉내낸 담장 실루엣. 3파 에셋이 오면 이미지로 대체된다 */
const FAR_SKY =
  'linear-gradient(180deg,rgba(8,8,6,0.92) 0%,rgba(26,19,8,0.34) 46%,rgba(26,19,8,0) 63%),' +
  'repeating-linear-gradient(90deg,rgba(0,0,0,0.44) 0 2.4%,rgba(0,0,0,0.16) 2.4% 5%)'
/** 전경 문틀 — 대청 경계에 드리우는 그림자 폭(world %) */
const JAMB_W_PCT = 3.2

// ── 가족 사랑방 (안3 / ARCH §2 FamilyHall) ────────────────────
/**
 * 사랑방 자리 — 안2.1 「큰 방 하나」에서는 구역(후원)이 아니라 **world 우측 영역**이다.
 * 구역이 하나뿐이라 code 로 찾을 자리가 없어졌고, 실내 문법상 사랑방은 같은 방의 오른편에 있다.
 * world 오른쪽 끝에서 INSET 만큼 띄운 폭 WIDTH 의 띠 — 좌표는 world %(=x0/x1) 다.
 */
const FAMILY_HALL_RIGHT_INSET_PCT = 4
const FAMILY_HALL_WIDTH_PCT = 64
/**
 * 사랑방 층 — 구역 구조물(StageLayers, z auto=0)보다 위·아이템 대역(depthZ 10~29)보다 아래.
 * 값만으로도 "무대 위에 선 인물" 자리에 들어간다(신위 스탠드 z-3 위, 신당지기 z-12 아래).
 * 큰 방에서는 대청 콘텐츠와 x 범위가 겹치지만, 좌석은 배경이 없는 오브·방석뿐이라
 * 아래로는 벽·마루만 가리고 위로는 아이템·신당지기가 그대로 앞에 선다.
 */
const FAMILY_HALL_Z = 8

/**
 * 합동 기도 낙관 반영 — 방금 기도한 **본인 좌석만** 켠다(서버 재조회 없이).
 * 만개(allPrayedToday) 판정은 서버(get_family_hall_presence 소비부)와 같은 규칙으로 다시 센다 —
 * 전원 점등이 되면 FamilyHall 이 data 만 보고 스스로 만개 연출로 넘어간다.
 * 이미 켜져 있으면 **같은 참조**를 돌려 헛 리렌더를 내지 않는다.
 */
function litSelfSeat(data: FamilyHallData, atIso: string): FamilyHallData {
  if (!data.isFamilyTier) return data
  const self = data.members.find((m) => m.memberId === null)
  if (!self || self.prayedToday) return data
  const members = data.members.map((m) => (m.memberId === null ? { ...m, prayedToday: true, lastWishAt: atIso } : m))
  return { ...data, members, allPrayedToday: members.length > 0 && members.every((m) => m.prayedToday) }
}

/**
 * 이 기기의 연출 등급. navigator 는 마운트 후에만 있으므로 렌더 중 호출 금지.
 * 프레임 실측(avgFps)은 rAF 상주 루프가 필요해 안1 범위 밖 — 메모리만으로 판정한다.
 */
function readEffectsTier(): EffectsTier {
  if (typeof navigator === 'undefined') return 'full'
  const dm = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null
  return effectsTier(dm, null)
}

/** sessionStorage 는 프라이빗 모드에서 던진다 — 실패해도 연출은 첫 진입 길이로 정상 재생된다. */
function readEntranceSeen(): boolean {
  try {
    return window.sessionStorage.getItem(ENTRANCE_SEEN_KEY) !== null
  } catch {
    return false
  }
}
function markEntranceSeen(): void {
  try {
    window.sessionStorage.setItem(ENTRANCE_SEEN_KEY, '1')
  } catch {
    // 저장 실패 = 다음 진입도 첫 진입 취급. 연출 외 부작용 없음
  }
}

/** 레거시 테마(stage 없음)용 기본 광원 — 테마의 --th-glow 색상을 광원색으로 쓴다. */
const LEGACY_LIGHT_ORIGIN = { x: 50, y: 52 } as const
/** #C9A84C 와 같은 색상, 알파만 그레이딩용으로 */
const LEGACY_LIGHT_COLOR = 'rgba(201,168,76,0.55)'
const LEGACY_LIGHT_INTENSITY = 0.45
const RGB_HEAD_RE = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i

/**
 * 레거시 광원색 — 테마 `--th-glow` 의 **색상만** 취하고 알파는 0.55 로 정규화한다.
 * glow 원본 알파(0.14)는 '은은한 blur 타원' 용도라 그대로 그레이딩에 쓰면 보이지 않는다.
 * 형식이 어긋나면 기본 촛불 금색.
 */
function legacyLightColor(glow: string | undefined): string {
  const m = glow ? RGB_HEAD_RE.exec(glow.trim()) : null
  return m ? `rgba(${m[1]},${m[2]},${m[3]},0.55)` : LEGACY_LIGHT_COLOR
}

interface Props {
  scene: StageSceneData
  /** 기원 현황(소유자 뷰에서만 주입). 방문자 뷰는 null → 기원 스트립 미표시. */
  devotion?: DevotionStatus | null
  /**
   * 가족 사랑방 좌석(본인 신당 탭에서만 서버가 주입). 가족 탭·방문자 뷰·로드 실패는 null →
   * 후원 구역에 사랑방을 얹지 않는다. 등급 게이트는 이미 서버에서 끝났다(isFamilyTier).
   */
  familyHall?: FamilyHallData | null
}

interface Ring {
  id: number
  x: number
  y: number
  color: string
}

let localSeq = 0
const nextLocalId = () => `local-${++localSeq}`

const themeVars = (pack: ThemePack | undefined): CSSProperties => {
  const a = pack?.assets ?? {}
  return {
    '--th-wall': a.wall ?? 'linear-gradient(180deg,#2b2214,#1d1810)',
    '--th-floor': a.floor ?? 'linear-gradient(180deg,#1a1308,#0f0b05)',
    '--th-accent': a.accent ?? '#c9a84c',
    '--th-glow': a.glow ?? 'rgba(201,168,76,0.14)',
    '--th-particle': a.particle ?? '#c9a84c',
    '--th-top': a.top ?? 'linear-gradient(90deg,transparent,rgba(201,168,76,0.5),transparent)',
  } as CSSProperties
}

export function ShrineRoomClient({ scene, devotion = null, familyHall = null }: Props) {
  // v2 무대 필드(kind·assetUrl)를 살려 색인한다 — indexCatalog 는 CatalogItem 으로 좁혀 반환하므로 직접 구성
  const catalogById = useMemo(
    () => new Map<string, StageCatalogItem>(scene.catalog.map((c) => [c.id, c])),
    [scene.catalog]
  )
  const { play, muted, toggleMute, startBgm } = useShrineAudio()
  const cin = useCinematics()
  // 재생 함수·주스는 참조가 고정돼 있다 — 콜백 deps 를 시네마틱 상태 변화로 오염시키지 않으려 분해한다
  const { playEntrance, playPrayer, shake: cinShake, vibrate: cinVibrate } = cin

  const [placements, setPlacements] = useState<StagePlacement[]>(scene.placements)
  /** KST 시각(낮밤 조명). null = 아직 마운트 전 — SSR·하이드레이션은 테마 원색 그대로 (#418 전례) */
  const [hour, setHour] = useState<number | null>(null)
  // ── 신위 탭 회전 (안2.3 ④) ──
  /** 회전 재생 중. true 인 동안 재탭은 무시된다(부록 C ④ 탭 잠금) */
  const [deitySpinning, setDeitySpinning] = useState(false)
  /**
   * 회전 허용 여부 = 연출 게이트 on + 모션 최소화 아님. matchMedia 는 마운트 후에만 읽는다
   * (렌더 중 호출하면 SSR 과 첫 클라 렌더가 갈린다 — #418 전례). false 면 탭 반응만 남는다.
   */
  const [spinAllowed, setSpinAllowed] = useState(false)
  /** 저사양 폴백 등급. 측정은 마운트 후 1회 */
  const [tier, setTier] = useState<EffectsTier>('full')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeCode, setActiveCode] = useState(scene.activePackCode)
  // 놋방울 배치 시 主神이 이름을 불러 맞이한다 (미배치면 테마 기본 인사)
  const [bubble, setBubble] = useState<string>(
    scene.greetingName
      ? personalGreeting(scene.activePackCode, scene.greetingName, scene.mainDeity?.name ?? null)
      : greetingFor(scene.activePackCode)
  )
  const [bounce, setBounce] = useState(0)
  const [rings, setRings] = useState<Ring[]>([])
  const seenResonance = useRef<Set<Element>>(new Set())
  const keeperTaps = useRef(0)
  const dirty = useRef(false)
  const effectsRef = useRef<EffectsHandle>(null)
  /** 기도 의식 중에만 띄우는 임시 불꽃 id — 저장된 lit 상태와 섞이지 않게 따로 추적한다 */
  const prayFlames = useRef<string[]>([])
  // 이 세션에서 방금 구매한 테마 코드 (서버 owned 플래그 재로드 없이 즉시 반영)
  const [purchasedCodes, setPurchasedCodes] = useState<Set<string>>(new Set())
  const [visibility, setVisibility] = useState<'public' | 'private'>(scene.visibility)
  const [visibilitySaving, setVisibilitySaving] = useState(false)
  // 신탁 선톡 — 좌정 主神이 선제적으로 건넨 신탁(있으면 말풍선에 특별 표시)
  const [oracle, setOracle] = useState<{ message: string } | null>(null)
  /**
   * 사랑방 좌석 — 서버 prop 이 정본이고(첫 렌더가 서버와 같아야 한다 · 하이드레이션 규율),
   * 합동 기도 낙관 점등만 이 상태가 서버보다 앞서 들고 있는다.
   *
   * 서버가 새 presence 를 내려주면(탭 전환·소원 뒤 refresh) **렌더 중** 즉시 그 값으로 되돌린다.
   * 룸은 탭을 옮겨도 같은 자리에 재사용되므로 effect 로 미루면 가족 탭 첫 페인트에 본인 탭 좌석이 한 프레임 스친다
   * (React "prop 이 바뀔 때 state 조정" 패턴 — 첫 렌더에는 두 값이 같아 조정 자체가 일어나지 않는다).
   */
  const [hall, setHall] = useState<FamilyHallData | null>(familyHall)
  const [hallSource, setHallSource] = useState<FamilyHallData | null>(familyHall)
  if (hallSource !== familyHall) {
    setHallSource(familyHall)
    setHall(familyHall)
  }

  // 저장된 점화 상태 → 불꽃 등록
  useEffect(() => {
    scene.placements.forEach((p) => {
      if (p.state.lit) effectsRef.current?.setFlame(p.id, p.x, p.y - FLAME_Y_OFFSET, true)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 낮밤 사이클 — 마운트 후에만 시각을 읽는다(서버·클라 렌더 결과 동일 유지).
  // 조명 오버레이는 .shrine-light-overlay 의 700ms transition 이 받아 부드럽게 넘어간다.
  useEffect(() => {
    const tick = () => setHour(kstHour(Date.now()))
    tick()
    const iv = window.setInterval(tick, SCENE_CLOCK_MS)
    return () => window.clearInterval(iv)
  }, [])

  // 입장 시네마틱 — 마운트 1회. 등급 측정도 여기서(같은 커밋의 state 는 아직 못 읽으므로 지역 변수로 쓴다).
  useEffect(() => {
    const t = readEffectsTier()
    setTier(t)
    // 신위 회전도 같은 연출 판정을 쓴다(게이트·모션 최소화 단일 출처 — useCinematics.motionAllowed)
    setSpinAllowed(motionAllowed())
    const revisit = readEntranceSeen() || t === 'lite'
    // 두루마리 입장 동선 — 마당(camX 0)에서 대청 정렬점으로. "대문으로 들어와 대청에 선다"(안2).
    //
    // 팬은 **매 진입 같은 길이**다(ENTRANCE_MS.pan). 재방문·저사양이라고 줄이면 암전이 걷히기도 전에
    // 이동이 끝나 입장 자체가 사라진다 — 카메라 팬은 transform 하나뿐이라 저사양에서도 절감할 값이 없다.
    // 화면을 덮는 암전·빛줄기만 기존대로 first/revisit 으로 갈린다(아래 playEntrance).
    // 연출 게이트가 꺼졌으면 ms 0 으로 즉시 대청. 모션 최소화(prefers-reduced-motion)는 CameraRig 가 스스로 점프한다.
    //
    // ⚠️ camX 는 마운트 시 0(마당)이 보장된다 — useCameraRig 의 camState 초기값이 0 이고,
    //    이 effect 는 카메라를 움직이는 다른 effect(테마 홈잉·꾸미기 진입)보다 먼저 등록돼 먼저 돈다.
    //
    // 신당지기 입장 걷기(WalkingKeeper)는 **같은 마운트에서 CSS 로 스스로 시작**한다 — 첫 페인트에
    // 애니메이션이 걸리고 이 팬도 같은 커밋에서 발화하므로 둘은 동시 시작이다(별도 동기화 타이머 없음).
    // 이번 검수 지적("입장이 안 보인다")의 해법은 이 팬이 아니라 그 캐릭터 쪽이다 — 팬은 보조로 남는다.
    if (worldActive) {
      panSource.current = 'system'
      panTo(daecheongCamX, GAMEFEEL_V1 ? ENTRANCE_MS.pan : 0)
    }
    if (!GAMEFEEL_V1) return
    markEntranceSeen()
    playEntrance(revisit)
    trackEvent({ action: 'shrine_cinematic', category: 'shrine', label: 'entrance', value: revisit ? 1 : 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 배경음(BGM) 자동 재생 — 진입 시 on. 모바일 autoplay 정책상 첫 제스처에서 확실히 시작.
  useEffect(() => {
    startBgm(scene.activePackCode)
    const kick = () => startBgm(scene.activePackCode)
    window.addEventListener('pointerdown', kick, { once: true })
    return () => window.removeEventListener('pointerdown', kick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 좌정 主神 시그니처 aura 상시 방출 (§3.3) — 신위 몸 주변에서 은은하게
  useEffect(() => {
    const d = scene.mainDeity
    effectsRef.current?.setAura(d?.particle ?? null, d?.accent ?? null, DEITY_POS.x, DEITY_POS.y, !!d)
    return () => effectsRef.current?.setAura(null, null, 0, 0, false)
  }, [scene.mainDeity])

  // 신탁 선톡 — 방 진입 시 좌정 主神의 선제적 신탁을 불러와 말풍선에 표시(있을 때만, 즉시 확인처리)
  // 가족 신당에서는 미표시(신탁은 본인 신당 스코프)
  useEffect(() => {
    if (!isOwner || !scene.mainDeity || scene.familyMemberId) return
    let alive = true
    getRoomOracle()
      .then((o) => {
        if (!alive || !o) return
        setOracle({ message: o.message })
        setBubble(o.message)
        setBounce((b) => b + 1)
        void markOracleSeen(o.id)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isOwner = scene.isOwner
  const activePack = scene.themes.find((t) => t.code === activeCode)
  const ownedThemeCount = scene.themes.filter((t) => t.owned || purchasedCodes.has(t.code)).length

  // ── 무대(舞臺) — stage 보유 테마만 조립식 렌더, 없으면 레거시 완성 일러스트 ──
  const activeStage = activePack?.stage ?? null

  // ── 두루마리(안2) — 테마 stage.zones 가 있는 테마에서만 가로 세계가 열린다 ──
  // 파싱은 stage jsonb **원본** 기준이다(StageSpec 은 단일 무대 4필드만 담아 zones 가 걸러진다).
  // zones 가 없으면 parseWorld 가 폭 100·대청 하나로 항등 폴백하므로 아래 worldActive 가 false 가 되고,
  // 렌더는 기존 단일 무대 그대로 나간다 — 레거시·현행 테마 회귀 0 의 단일 분기점이다.
  const world = useMemo(() => parseWorld(activeStage, activePack?.stageRaw ?? null), [activeStage, activePack])
  const worldActive = SCROLL_SHRINE_V1 && world.width > WORLD_VIEWPORT_PCT
  const daecheong = useMemo(() => daecheongZone(world), [world])
  const cam = useCameraRig(world, { enabled: SCROLL_SHRINE_V1, editing })
  // panTo 는 참조가 고정돼 있다 — cam 객체는 camX 마다 새로 나므로 effect deps 를 오염시키지 않으려 분해한다
  const { panTo } = cam
  /** 대청 정렬점 — 입장·편집 진입이 모두 여기로 모인다 */
  const daecheongCamX = useMemo(() => zoneAlignCamX(world, daecheong), [world, daecheong])
  /**
   * 대청 무대 사양. 구역이 제 에셋을 안 들고 있으면 테마 단일 무대를 물려받는다 —
   * 기존 stage 에 zones 만 얹어도 대청이 지금 화면 그대로 나오는 세대교체 경로다.
   * 두루마리가 아니면 activeStage 를 **참조까지 그대로** 돌려 기존 렌더와 완전히 같게 둔다.
   */
  const daecheongStage = useMemo(
    () => (worldActive ? zoneStage(daecheong, activeStage) : activeStage),
    [worldActive, daecheong, activeStage]
  )
  /**
   * 대청이 뷰포트보다 넓을 때(안2.1 큰 방 하나) % 폭이 같이 커지는 것을 되돌리는 계수.
   * 계산은 world-render `zoneWidthScale` 단일 출처이고, 뷰포트 이하 구역·단일 무대는 1 이라
   * 아래 환산들이 전부 항등식이 된다(현행 3구역 라이브 회귀 0).
   */
  const stageScale = useMemo(() => (worldActive ? zoneWidthScale(daecheong) : 1), [worldActive, daecheong])
  /**
   * 벽지·바닥 가로 반복 여부. worldActive 를 같이 보는 이유는 원복 레버 때문이다 —
   * 게이트를 내리면 무대 사양이 최상위 단일 무대(늘려 쓰는 한 장)로 돌아가므로 타일 신호도 같이 꺼야 한다.
   */
  const daecheongTile = worldActive && daecheong.tile === true
  /** 큰 방 여부 — 폭 장식 환산과 말풍선 재배치의 유일한 분기 */
  const wideRoom = stageScale !== 1
  /**
   * 겉보기 폭 유지 환산. 등배(1)면 **원래 문자열 그대로** 돌려 DOM 이 한 글자도 바뀌지 않게 한다
   * (`64%` → `64.0000%` 같은 무해한 변화도 회귀 진단을 어렵게 만든다).
   */
  const scaleW = useCallback(
    (pct: number) => (wideRoom ? `${Math.round(pct * stageScale * 1e4) / 1e4}%` : `${pct}%`),
    [wideRoom, stageScale]
  )
  // ── 거니는 신당지기 배선 (안2.2) ──────────────────────────────
  /**
   * 두루마리에서만 거닌다. 단일 무대·레거시는 KEEPER_POS 정위치 그대로다(회귀 0) —
   * 좁은 방에서 캐릭터가 왕복하면 제단·아이템을 계속 스치고 지나간다.
   * 연출 게이트(GAMEFEEL_V1)를 내리면 보행도 함께 사라진다(ARCH §8 원복 레버).
   */
  const keeperWalks = GAMEFEEL_V1 && worldActive
  /**
   * 신당지기 정지 위치(구역 로컬 %) — 배회 구간의 중점. 입장 도착점·모션최소화 정위치·
   * **공물 건네기 판정 기준점**이 모두 이 하나로 모인다(보이는 자리와 드롭 판정이 어긋나면 공물이 먹통이 된다).
   */
  const keeperHomeX = keeperWalks ? keeperRestX(KEEPER_WANDER) : KEEPER_POS.x
  /** 꾸미기 중에는 배회를 접고 정지 위치에 세운다 — 그 자리가 공물 드롭 타깃이다 */
  const keeperRange = useMemo<KeeperRange>(
    () => (keeperWalks && !editing ? KEEPER_WANDER : { from: keeperHomeX, to: keeperHomeX }),
    [keeperWalks, editing, keeperHomeX]
  )
  /** 입장 걷기 — 마운트 1회. deps 에 editing 이 없어 꾸미기 토글로 다시 걸어 들어오지 않는다.
   *  길이는 상수가 아니라 **배회 속도에서 파생**한다(entranceMsFor) — 안2.3 까지 두 상수가 따로 놀아
   *  입장이 배회보다 11배 빨랐고 그것이 4차 검수 "입장속도 아직 빠름"의 원인이었다. */
  const keeperEntrance = useMemo<KeeperEntranceSpec | null>(() => {
    if (!keeperWalks) return null
    const ms = entranceMsFor(KEEPER_ENTRANCE_FROM, planKeeperWalk(KEEPER_WANDER))
    if (ms === null) return null
    return { from: KEEPER_ENTRANCE_FROM, to: keeperHomeX, ms }
  }, [keeperWalks, keeperHomeX])
  const [keeperPaused, setKeeperPaused] = useState(false)
  const keeperPauseTimer = useRef<number | null>(null)
  useEffect(
    () => () => {
      if (keeperPauseTimer.current !== null) window.clearTimeout(keeperPauseTimer.current)
    },
    []
  )

  /** 대청 밖 구역(마당·후원)의 무대 세트 — 대청은 기존 렌더 덩어리를 그대로 쓰므로 제외한다 */
  const scenery = useMemo(() => {
    if (!worldActive) return []
    return world.zones
      .filter((z) => z.code !== daecheong.code)
      .map((z) => ({
        code: z.code,
        box: zoneBox(world, z),
        stage: zoneStage(z, null),
        tile: z.tile === true,
        scale: zoneWidthScale(z),
      }))
  }, [worldActive, world, daecheong])
  const daecheongBox = useMemo(() => zoneBox(world, daecheong), [world, daecheong])
  /**
   * 사랑방을 얹을 박스 — **world 우측 영역**(안2.1). 아래 중 하나라도 아니면 null 이고,
   * 그러면 사랑방은 아예 마운트되지 않는다: 연출 게이트 on(GAMEFEEL_V1) ·
   * 두루마리(worldActive ⊃ SCROLL_SHRINE_V1) · 좌석 데이터.
   * 두 플래그 중 하나만 내려도 자동 비노출이라 사랑방도 같은 레버로 원복된다(ARCH §8).
   *
   * ⚠️ 구역 code('huwon') 탐색이 아니다 — 단일 구역 시드가 적용되면 후원이 사라져 사랑방이
   *    예외도 로그도 없이 화면에서 증발한다. 좌표로 잡으면 구역 구성과 무관하게 자리가 남는다.
   */
  const hallBox = useMemo<CSSProperties | null>(() => {
    if (!GAMEFEEL_V1 || !worldActive || !hall) return null
    const x1 = world.width - FAMILY_HALL_RIGHT_INSET_PCT
    const x0 = x1 - FAMILY_HALL_WIDTH_PCT
    return {
      left: `${((x0 / world.width) * 100).toFixed(4)}%`,
      width: `${((FAMILY_HALL_WIDTH_PCT / world.width) * 100).toFixed(4)}%`,
      zIndex: FAMILY_HALL_Z,
    }
  }, [worldActive, hall, world.width])
  /** 시차층 계수 CSS 변수 — 폭이 바뀔 때만 다시 계산된다 */
  const worldVars = useMemo<CssVars>(
    () => ({
      '--shrine-par-far': parallaxShiftPct(world, PARALLAX.far),
      '--shrine-par-near': parallaxShiftPct(world, PARALLAX.near),
    }),
    [world]
  )
  const farStyle = useMemo<CSSProperties>(
    () => ({
      width: `${world.width}%`,
      transform: FAR_TRANSFORM,
      willChange: 'transform',
      backgroundImage: FAR_SKY,
      backgroundSize: '100% 100%, 100% 13%',
      backgroundPosition: '0 0, 0 54%',
      backgroundRepeat: 'no-repeat, repeat-x',
    }),
    [world.width]
  )
  const nearStyle = useMemo<CSSProperties>(
    () => ({ width: `${world.width}%`, transform: NEAR_TRANSFORM, willChange: 'transform' }),
    [world.width]
  )
  /** 대청 경계에 드리우는 문틀 그림자 — 전경층 안이라 좌표는 world 폭 기준 % */
  const jambStyle = useCallback(
    (side: 'left' | 'right'): CSSProperties => {
      const edge = ((side === 'left' ? daecheong.x0 : daecheong.x1) / world.width) * 100
      const w = (JAMB_W_PCT / world.width) * 100
      return {
        left: `${(side === 'left' ? edge : edge - w).toFixed(4)}%`,
        width: `${w.toFixed(4)}%`,
        background:
          side === 'left'
            ? 'linear-gradient(90deg,rgba(0,0,0,0.5),rgba(0,0,0,0))'
            : 'linear-gradient(270deg,rgba(0,0,0,0.5),rgba(0,0,0,0))',
      }
    },
    [daecheong.x0, daecheong.x1, world.width]
  )
  /** 팬의 출처 — 사용자 조작(제스처·미니맵)일 때만 GA4 에 남긴다(입장·편집 자동 이동은 제외) */
  const panSource = useRef<'user' | 'system'>('system')
  const bindRoom = useMemo(
    () => ({
      ...cam.bindPan,
      onPointerDown: (e: RPointerEvent) => {
        // 시네마틱 재생 중 입력은 "스킵 탭" 1종만(ARCH §4). 연출 오버레이는 전파를 막지 않으므로 여기서 끊는다 —
        // 안 끊으면 스킵 탭이 진행 중인 입장 팬을 취소해 카메라가 마당과 대청 사이에 멈춘다.
        if (cin.active) return
        panSource.current = 'user'
        cam.bindPan.onPointerDown(e)
      },
    }),
    [cam.bindPan, cin.active]
  )

  // 구역 도착 1회 기록 — 팬이 멈춘(관성·스냅까지 끝난) 순간에만. 팬 시작마다 찍으면 표본이 부풀어 오른다.
  const wasPanning = useRef(false)
  useEffect(() => {
    const was = wasPanning.current
    wasPanning.current = cam.panning
    if (!was || cam.panning || panSource.current !== 'user') return
    trackEvent({ action: 'shrine_pan', category: 'shrine', label: zoneCodeAt(world, cam.camX) })
  }, [cam.panning, cam.camX, world])

  // 꾸미기 진입 — 배치 도구가 보이는 대청으로 카메라를 부른다(마당에서 편집을 시작하면 보관함이 헛돈다)
  useEffect(() => {
    if (!editing || !worldActive) return
    panSource.current = 'system'
    panTo(daecheongCamX)
  }, [editing, worldActive, daecheongCamX, panTo])

  /**
   * 테마 전환 — 새 두루마리에서도 대청부터 보여준다.
   * 카메라는 테마 소유가 아니라 방 소유라 전환해도 camX 가 남는다. 그대로 두면 마당(camX 0)이나
   * 후원에 선 채로 새 테마가 열려 "방금 고른 신당의 제단이 화면 밖" 이 된다 — 입장과 같은 도착점으로 모은다.
   * 마운트 1회는 입장 팬(위 시네마틱 effect)이 이미 같은 자리로 데려가므로 건너뛴다.
   */
  const camHomed = useRef(false)
  useEffect(() => {
    if (!camHomed.current) {
      camHomed.current = true
      return
    }
    if (!worldActive) return
    panSource.current = 'system'
    panTo(daecheongCamX)
  }, [activeCode, worldActive, daecheongCamX, panTo])

  /**
   * 두루마리↔단일 무대 전환은 대청 덩어리(EffectsCanvas 포함)를 통째로 재마운트시킨다 —
   * 새 캔버스에는 지속 불꽃도 主神 aura 도 없다. 살아 있던 연출을 다시 등록해 촛불이 꺼진 채 남지 않게 한다.
   * (등록은 멱등이라 마운트 시 한 번 더 도는 것은 무해하다.)
   */
  useEffect(() => {
    const d = scene.mainDeity
    effectsRef.current?.setAura(d?.particle ?? null, d?.accent ?? null, DEITY_POS.x, DEITY_POS.y, !!d)
    placements.forEach((p) => {
      if (p.state.lit) effectsRef.current?.setFlame(p.id, p.x, p.y - FLAME_Y_OFFSET, true)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worldActive])

  /** 조명: stage.light 우선, 레거시는 테마 --th-glow 색 기반 기본 광원 */
  const light: StageLight = useMemo(
    () =>
      activeStage?.light ?? {
        color: legacyLightColor(activePack?.assets.glow),
        intensity: LEGACY_LIGHT_INTENSITY,
        origin: { ...LEGACY_LIGHT_ORIGIN },
      },
    [activeStage, activePack]
  )
  /** 앵커: 구조물 anchors 합집합, 없으면(레거시·앵커 미정의 무대) 기본 앵커.
      두루마리에서도 배치는 대청에만 살므로 대청 구조물만 본다 — 단일 무대에서는 activeStage 와 동일하다. */
  const anchors = useMemo<readonly StageAnchor[]>(() => {
    const union = daecheongStage?.structures.flatMap((s) => s.anchors) ?? []
    return union.length > 0 ? union : DEFAULT_ANCHORS
  }, [daecheongStage])
  /** 드래그 중 스냅 대상 앵커 (골드 링 하이라이트) */
  const [snapAnchor, setSnapAnchor] = useState<StageAnchor | null>(null)
  /** 이번 꾸미기에서 새로 앵커에 올린 배치 — 저장 시 신위 한마디 1회 */
  const pendingAnchor = useRef<StageAnchor | null>(null)
  const deitiesHref = scene.familyMemberId
    ? `/protected/shrine/deities?member=${scene.familyMemberId}`
    : '/protected/shrine/deities'

  // 기운 실시간 계산
  const { energy, yongsin, resonant } = useMemo(
    () => computeEnergy(scene.profile.base, placements, catalogById),
    [scene.profile.base, placements, catalogById]
  )
  const displayYongsin: Element = scene.profile.yongsin ?? yongsin
  // 가이드바용: 필요 기운(용신)에 해당하는 신물이 이미 배치돼 있는지
  const neededElementPlaced = useMemo(
    () => placements.some((p) => catalogById.get(p.catalogItemId)?.element === displayYongsin),
    [placements, catalogById, displayYongsin]
  )

  // 조명 오버레이 — 점화(lit)한 촛불이 많을수록 방이 밝아진다(연출 인센티브, §3-C4)
  // + 낮밤 사이클: hour 가 잡히기 전(SSR·첫 렌더)엔 테마 원색 그대로 둔다.
  const lightOverlay = useMemo(() => {
    const litCount = placements.reduce((n, p) => (p.state.lit ? n + 1 : n), 0)
    return lightingOverlayStyle(hour === null ? light : sceneLight(light, hour), litBoost(litCount))
  }, [placements, light, hour])

  // 보관함 가용 수량 = 보유 - 배치
  const available = useMemo(() => {
    const placed = new Map<string, number>()
    placements.forEach((p) => placed.set(p.catalogItemId, (placed.get(p.catalogItemId) ?? 0) + 1))
    return scene.inventory
      .map((inv) => ({ item: catalogById.get(inv.catalogItemId), qty: inv.qty - (placed.get(inv.catalogItemId) ?? 0) }))
      .filter((e): e is { item: StageCatalogItem; qty: number } => !!e.item && e.qty > 0)
  }, [placements, scene.inventory, catalogById])

  const lastActivity = useRef(Date.now())
  const keeperSay = useCallback((html: string, doBounce = true) => {
    lastActivity.current = Date.now()
    setBubble(html)
    if (doBounce) setBounce((b) => b + 1)
  }, [])

  // 신당지기 idle — 75초 무활동 시 잔잔한 혼잣말
  useEffect(() => {
    const iv = window.setInterval(() => {
      if (editing) return
      if (Date.now() - lastActivity.current > 75000) {
        lastActivity.current = Date.now()
        keeperSay(idleLine(Date.now()), true)
      }
    }, 15000)
    return () => window.clearInterval(iv)
  }, [editing, keeperSay])

  // ── 향로 상시 연기 — 방이 "가만히 있어도 살아있게" 하는 유일한 상시 이미터 ──
  // 캔버스는 손대지 않고 기존 emit 만 주기 호출한다(고DPR 흰화면 전례 — 캔버스 표면적 증가 금지).
  const smokeSpots = useMemo(
    () =>
      placements
        .filter((p) => catalogById.get(p.catalogItemId)?.behavior.tap === 'smoke')
        // 앞쪽(y 큰) 향로부터 — 뒤에 가려진 연기는 값만 치르고 보이지 않는다
        .sort((a, b) => b.y - a.y)
        .slice(0, SMOKE_MAX)
        .map((p) => ({ x: p.x, y: p.y })),
    [placements, catalogById]
  )

  useEffect(() => {
    if (!GAMEFEEL_V1 || editing || tier !== 'full' || smokeSpots.length === 0) return
    const puff = () => {
      // 백그라운드 탭에서는 rAF 가 멈춰 파티클이 큐에만 쌓인다 — 아예 쏘지 않는다
      if (document.visibilityState !== 'visible') return
      smokeSpots.forEach((s) => effectsRef.current?.emit('smoke', s.x, s.y - FLAME_Y_OFFSET))
    }
    const iv = window.setInterval(puff, SMOKE_INTERVAL_MS)
    return () => window.clearInterval(iv)
  }, [editing, tier, smokeSpots])

  // ── 상시 빛가루 — 촛불·향로·걸이가 하나도 없는 신당에서도 상시 모션을 보장한다 (안1.1) ──
  const moteIdx = useRef(0)
  useEffect(() => {
    if (!GAMEFEEL_V1 || editing || tier !== 'full') return
    const iv = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      const spot = MOTE_SPOTS[moteIdx.current % MOTE_SPOTS.length]
      moteIdx.current += 1
      effectsRef.current?.emit('sparkle', spot.x, spot.y)
    }, MOTE_INTERVAL_MS)
    return () => window.clearInterval(iv)
  }, [editing, tier])

  // ── 기도 의식 — 소원 폼이 기원 +1 을 알리면(SHRINE_PRAYED_EVENT) 룸이 연출을 받는다 ──
  // 시각 연출 전용: 점화는 임시 불꽃(pray-*)이라 저장된 lit 상태를 건드리지 않는다(setPlacementLit 미호출).
  useEffect(() => {
    if (!isOwner || editing) return
    const onPrayed = () => {
      trackEvent({ action: 'shrine_cinematic', category: 'shrine', label: 'prayer' })
      playPrayer({
        onIgnite: () => {
          const ids: string[] = []
          placements.forEach((p) => {
            if (p.state.lit) return
            if (catalogById.get(p.catalogItemId)?.behavior.tap !== 'toggleLit') return
            const id = `pray-${p.id}`
            ids.push(id)
            effectsRef.current?.setFlame(id, p.x, p.y - FLAME_Y_OFFSET, true)
            effectsRef.current?.emit('flame', p.x, p.y - FLAME_Y_OFFSET)
          })
          prayFlames.current = ids
          play('crackle')
        },
        onPeak: () => {
          keeperSay(prayerLine(Date.now()))
          play('bell')
          const d = scene.mainDeity
          if (d?.particle && d.accent) effectsRef.current?.burstAura(d.particle, d.accent, DEITY_POS.x, DEITY_POS.y)
          // 카메라 전이가 멈춘 절정에서 흔들어야 의도대로 읽힌다
          cinShake()
          cinVibrate(20)
          effectsRef.current?.emit('sparkle', PRAYER_SPARKLE_POS.x, PRAYER_SPARKLE_POS.y)
        },
        onEnd: () => {
          prayFlames.current.forEach((id) => effectsRef.current?.setFlame(id, 0, 0, false))
          prayFlames.current = []
        },
      })
    }
    window.addEventListener(SHRINE_PRAYED_EVENT, onPrayed)
    return () => window.removeEventListener(SHRINE_PRAYED_EVENT, onPrayed)
  }, [isOwner, editing, placements, catalogById, play, keeperSay, playPrayer, cinShake, cinVibrate, scene.mainDeity])

  // ── 합동 기도 — 기도가 성립하면 서버 재조회(router.refresh)를 기다리지 않고 본인 좌석부터 켠다.
  // 연출(불꽃·셰이크)은 위 기도 의식 effect 담당이라 여기서는 데이터만 앞당긴다. 편집 중에도 유효 —
  // 소원 폼은 룸 밖에 있어 꾸미기 중에도 기도가 성립한다.
  useEffect(() => {
    if (!familyHall) return
    const onPrayed = () => {
      const at = new Date().toISOString()
      setHall((prev) => (prev ? litSelfSeat(prev, at) : prev))
    }
    window.addEventListener(SHRINE_PRAYED_EVENT, onPrayed)
    return () => window.removeEventListener(SHRINE_PRAYED_EVENT, onPrayed)
  }, [familyHall])

  const spawnRing = useCallback((x: number, y: number, color: string) => {
    const id = ++localSeq
    setRings((r) => [...r, { id, x, y, color }])
    window.setTimeout(() => setRings((r) => r.filter((k) => k.id !== id)), 1400)
  }, [])

  // 공명 판정 (배치 변경 시)
  const checkResonance = useCallback(() => {
    resonant.forEach((hit) => {
      if (seenResonance.current.has(hit.element)) return
      seenResonance.current.add(hit.element)
      spawnRing(hit.cx, hit.cy, EL_COLOR[hit.element])
      effectsRef.current?.emit('sparkle', hit.cx, hit.cy)
      effectsRef.current?.emit('resonance', hit.cx, hit.cy) // 오행 공명 파티클(F-5)
      play('bara')
      toast.success(`⚡ 오행 공명! ${EL_KO[hit.element]} 기운 +5`)
      keeperSay(resonanceLine(hit.element))
      trackEvent({ action: 'shrine_combo', category: 'shrine', label: hit.element })
    })
  }, [resonant, spawnRing, play, keeperSay])

  // ── 아이템 탭 (보기 모드) ──
  const onTapItem = useCallback(
    (p: StagePlacement) => {
      if (editing) return
      const item = catalogById.get(p.catalogItemId)
      if (!item) return
      cinVibrate(8)
      const b = item.behavior
      if (b.tap === 'toggleLit') {
        const lit = !p.state.lit
        setPlacements((prev) => prev.map((q) => (q.id === p.id ? { ...q, state: { ...q.state, lit } } : q)))
        dirty.current = true
        // 보기 모드 점화는 즉시 저장 (편집 저장을 거치지 않아도 유지)
        if (isOwner && !p.id.startsWith('local-')) void setPlacementLit(p.id, lit)
        play(b.sound ?? 'crackle')
        effectsRef.current?.setFlame(p.id, p.x, p.y - FLAME_Y_OFFSET, lit)
        if (lit) {
          effectsRef.current?.emit('flame', p.x, p.y - FLAME_Y_OFFSET)
          if (item.element) keeperSay(litLine(item.name, item.element))
        }
      } else {
        play(b.sound ?? 'moktak')
        if (b.tap === 'smoke') effectsRef.current?.emit('smoke', p.x, p.y - FLAME_Y_OFFSET)
        if (item.element) keeperSay(tapLine(item.element, Date.now()))
      }
      trackEvent({ action: 'shrine_tap', category: 'shrine', label: item.type })
    },
    [editing, catalogById, play, keeperSay, isOwner, cinVibrate]
  )

  // ── 앵커 스냅 하이라이트 (드래그 중, 앵커가 바뀔 때만 호출) ──
  const onAnchorHover = useCallback((a: StageAnchor | null) => setSnapAnchor(a), [])

  // ── 드래그 종료 (편집 모드) ──
  const onDragEnd = useCallback(
    (p: StagePlacement, x: number, y: number, anchorId: string | null) => {
      setPlacements((prev) => prev.map((q) => (q.id === p.id ? { ...q, x, y, anchorId } : q)))
      dirty.current = true
      // 새로 '의미 있는 자리'에 올렸으면 — 저장 시 신위가 한마디 (§3-D)
      if (anchorId && anchorId !== p.anchorId) {
        pendingAnchor.current = anchors.find((a) => a.id === anchorId) ?? null
        effectsRef.current?.emit('sparkle', x, y)
      }
      const item = catalogById.get(p.catalogItemId)
      // 판정 기준은 **꾸미기 중 신당지기가 서 있는 자리**(keeperHomeX) — 큰 방에서 12% 는 화면 밖이라
      // 보이는 신당지기에 올려도 아무 일이 없었다. y 는 예나 지금이나 KEEPER_POS.y 다.
      if (item?.behavior.give && Math.hypot(x - keeperHomeX, y - KEEPER_POS.y) < KEEPER_GIVE_RADIUS) {
        play('bell')
        setBounce((b) => b + 1)
        effectsRef.current?.emit('sparkle', keeperHomeX, KEEPER_POS.y)
        effectsRef.current?.emit('petals', keeperHomeX, KEEPER_POS.y) // 공물 헌납 파티클(F-5)
        toast(`🔮 신당지기가 ${item.name}을(를) 받았습니다`)
        keeperSay(giveLine(Date.now()))
        if (isOwner) void recordKeeperGift(item.name)
        trackEvent({ action: 'keeper_give', category: 'shrine', label: item.type })
      }
      window.setTimeout(checkResonance, 0)
    },
    [catalogById, play, keeperSay, checkResonance, isOwner, anchors, keeperHomeX]
  )

  // ── 수납 (편집 모드) ──
  const onRemove = useCallback(
    (p: StagePlacement) => {
      setPlacements((prev) => prev.filter((q) => q.id !== p.id))
      dirty.current = true
      effectsRef.current?.setFlame(p.id, 0, 0, false)
      play('moktak')
    },
    [play]
  )

  // ── 보관함에서 꺼내기 ──
  const onPlaceFromTray = useCallback(
    (item: StageCatalogItem) => {
      const spot = initialSpot(item.layer, Math.random())
      setPlacements((prev) => [
        ...prev,
        {
          id: nextLocalId(),
          catalogItemId: item.id,
          layer: item.layer,
          x: spot.x,
          y: spot.y,
          flip: false,
          anchorId: null,
          state: {},
        },
      ])
      dirty.current = true
      play('moktak')
      window.setTimeout(checkResonance, 0)
    },
    [play, checkResonance]
  )

  // ── 꾸미기 토글 + 저장 ──
  const toggleEdit = useCallback(async () => {
    if (!isOwner) return
    if (editing) {
      // 완료 → 저장
      if (dirty.current) {
        setSaving(true)
        const res = await saveShrineLayout(
          placements.map((p) => ({
            catalogItemId: p.catalogItemId,
            layer: p.layer,
            x: p.x,
            y: p.y,
            flip: p.flip,
            anchorId: p.anchorId,
            state: p.state,
          })),
          scene.familyMemberId
        )
        setSaving(false)
        if (res.success) {
          dirty.current = false
          // 저장 시 placement id가 재발급됨 — 서버 반환값으로 교체해야 이후 점화 저장이 유효
          if (res.placements) setPlacements(res.placements)
          play('bell')
          toast.success('신당이 저장되었습니다')
          trackEvent({ action: 'placement_save', category: 'shrine' })
          // 앵커에 새로 올린 배치가 있으면 신위가 한마디 (기존 말풍선 재사용).
          // 스냅했다가 다시 빼낸 경우는 제외 — 저장된 배치에 그 앵커가 남아 있을 때만.
          const anchored = pendingAnchor.current
          pendingAnchor.current = null
          if (anchored && placements.some((q) => q.anchorId === anchored.id)) {
            keeperSay(anchorLine(anchored.label, Date.now()))
          }
        } else {
          toast.error(res.error === 'NOT_ENOUGH_OWNED' ? '보유하지 않은 아이템입니다' : '저장 실패')
          return
        }
      }
      setSnapAnchor(null)
      setEditing(false)
    } else {
      setEditing(true)
    }
  }, [editing, placements, play, isOwner, scene.familyMemberId, keeperSay])

  // ── 신당지기(=좌정 主神) 탭 — 시그니처 사운드+파티클 버스트 반응 (§3.2) ──
  // spot = 탭 순간 실측한 캐릭터 자리(거니는 중이면 정위치와 다르다). 못 재면 정지 위치로 폴백한다.
  const onTapKeeper = useCallback(
    (spot: KeeperSpot | null) => {
      if (editing) return
      const deity = scene.mainDeity
      cinVibrate(8)
      // 좌정 主神이 있으면 신위 고유 사운드+파티클, 없으면 기본 목탁
      play(deity?.sound ?? 'moktak')
      if (deity?.particle && deity.accent) {
        effectsRef.current?.burstAura(deity.particle, deity.accent, spot?.x ?? keeperHomeX, spot?.y ?? KEEPER_POS.y)
      }
      // 걸음을 멈추고 눈을 맞춘다 — 말풍선을 읽을 동안만(부록 B 상호작용)
      setKeeperPaused(true)
      if (keeperPauseTimer.current !== null) window.clearTimeout(keeperPauseTimer.current)
      keeperPauseTimer.current = window.setTimeout(() => {
        keeperPauseTimer.current = null
        setKeeperPaused(false)
      }, KEEPER_TAP_PAUSE_MS)
      setBounce((b) => b + 1)
      keeperTaps.current += 1
      if (keeperTaps.current >= KEEPER_TAP_LIMIT) {
        keeperSay(KEEPER_SNEEZE)
        keeperTaps.current = 0
        return
      }
      keeperSay(keeperTapLine(keeperTaps.current))
    },
    [editing, play, keeperSay, scene.mainDeity, cinVibrate, keeperHomeX]
  )

  // ── 좌정 신위(제단 위 스탠드) 탭 — 한 바퀴 회전 + 기존 반응 (안2.3 ④) ──
  /**
   * 반응(사운드·아우라 버스트·말풍선·햅틱)은 신당지기 탭과 **같은 경로**를 탄다 — 신당지기가 곧 좌정 主神이라
   * 두 벌로 나누면 대사 카운트(KEEPER_TAP_LIMIT)와 사운드가 서로 어긋난다. 파티클 좌표만 신위 몸통으로 준다.
   * 회전은 그 위에 얹는 연출이라, 재생 중 재탭은 **반응까지 통째로 무시**한다(부록 C ④ 탭 잠금).
   */
  const onTapDeity = useCallback(() => {
    if (editing || deitySpinning) return
    onTapKeeper({ x: DEITY_POS.x, y: DEITY_POS.y })
    if (!spinAllowed) return
    setDeitySpinning(true)
    trackEvent({ action: 'deity_spin', category: 'shrine', label: scene.mainDeity?.code ?? 'none' })
  }, [editing, deitySpinning, onTapKeeper, spinAllowed, scene.mainDeity])

  const onDeitySpinEnd = useCallback(() => setDeitySpinning(false), [])

  /**
   * 턴어라운드 프레임 경로(45°·측면·135°·뒷면). 회전이 애초에 불가한 상태(게이트 오프·모션 최소화)에서는 null 을 줘
   * DeityTurn 이 프리로드 요청조차 하지 않게 한다 — 실재 판정은 그 프리로드 결과가 정본이다.
   */
  const deityFrames = useMemo(
    () => (spinAllowed ? deityTurnFrames(scene.mainDeity?.code) : null),
    [spinAllowed, scene.mainDeity?.code]
  )

  // ── 테마 전환 ──
  const applyTheme = useCallback(
    async (pack: ThemePack) => {
      const prev = activeCode
      setActiveCode(pack.code)
      keeperSay(greetingFor(pack.code))
      play('chime')
      const res = await activateThemePack(pack.code, scene.familyMemberId)
      if (!res.success) {
        setActiveCode(prev)
        toast.error('테마 변경 실패')
      } else {
        trackEvent({ action: 'pack_activate', category: 'shrine', label: pack.code })
      }
    },
    [activeCode, keeperSay, play, scene.familyMemberId]
  )

  // 미보유 유료 테마 — 그 자리에서 복채 구매 후 즉시 적용
  const buyAndApplyTheme = useCallback(
    async (pack: ThemePack) => {
      const r = await purchaseThemePack(pack.code)
      if (!r.success && r.error !== 'ALREADY_OWNED') {
        toast.error(
          r.error === 'INSUFFICIENT_BOKCHAE'
            ? '복채가 부족합니다 — 상점에서 충전할 수 있어요'
            : '봉헌이 이루어지지 않았습니다. 다시 시도해주세요.'
        )
        return
      }
      setPurchasedCodes((prevSet) => new Set(prevSet).add(pack.code))
      if (r.success) toast.success(`${pack.name} 봉헌 완료 — 신당에 적용합니다`)
      await applyTheme(pack)
    },
    [applyTheme]
  )

  const onSelectTheme = useCallback(
    async (pack: ThemePack) => {
      if (!pack.owned && !purchasedCodes.has(pack.code)) {
        toast(`${pack.name} — 복채 ${pack.priceBokchae}만냥으로 봉헌할까요?`, {
          description: '봉헌 즉시 이 신당에 적용됩니다',
          action: { label: `복채 ${pack.priceBokchae}만냥 봉헌`, onClick: () => void buyAndApplyTheme(pack) },
        })
        return
      }
      await applyTheme(pack)
    },
    [applyTheme, buyAndApplyTheme, purchasedCodes]
  )

  // ── 공개/비공개 전환 — 가족 신당은 이름이 드러나므로 공개 전에 확인을 받는다 ──
  const toggleVisibility = useCallback(async () => {
    const next = visibility === 'public' ? 'private' : 'public'
    if (next === 'public' && scene.familyMemberId) {
      const ok = window.confirm(
        '이 신당을 공개하면 신당 이름(“○○의 신당”)으로 가족의 이름이 다른 사람에게 보일 수 있습니다.\n공개할까요?'
      )
      if (!ok) return
    }
    setVisibilitySaving(true)
    const prev = visibility
    setVisibility(next)
    const res = await setShrineVisibility(next, scene.familyMemberId)
    setVisibilitySaving(false)
    if (!res.success) {
      setVisibility(prev)
      toast.error('공개 설정 변경 실패')
    } else {
      toast.success(next === 'public' ? '이 신당이 공개되었습니다' : '이 신당을 비공개로 바꾸었습니다')
    }
  }, [visibility, scene.familyMemberId])

  /**
   * 방 모서리 라운딩 — 단일 무대에서는 대청이 곧 방이라 전면 레이어를 방과 같이 둥글린다.
   * 두루마리에서는 대청이 세계 한가운데(x0~x1)라 모서리가 없다 — 둥글리면 구역 경계에 잘린 자국이 남는다.
   * (StageLayers 의 `zoned` 와 같은 규약. 방 자체의 rounded-[18px] 는 그대로다.)
   */
  const roundAll = worldActive ? '' : ' rounded-[17px]'
  const roundBottom = worldActive ? '' : ' rounded-b-[17px]'

  /**
   * 대청(大廳) 구역의 내용물 전체 — 배치·신위·신당지기·앵커·존가이드·캔버스·조명이 한 덩어리다.
   *
   * 두루마리에서는 이 덩어리를 world 안의 대청 박스(폭이 뷰포트와 같다)로 통째로 감싼다.
   * 그래서 기존 % 좌표·캔버스 크기·드래그 환산(Sprite 가 parentElement 를 기준 삼는다)이 **무수정**으로 성립한다.
   * 단일 무대에서는 이 조각이 방의 직계 자식으로 그대로 나가 기존 DOM 과 같다(회귀 0 제1원칙).
   */
  const stageContent = (
    <>
      {/* L0 벽지 · L1 바닥재 (stage 테마) / 벽·바닥 블록 + room.webp (레거시) */}
      <StageLayers
        stage={daecheongStage}
        themeCode={activeCode}
        slot="ground"
        zoned={worldActive}
        tile={daecheongTile}
      />
      {/* 살아있는 방 — 테마별 요소 오버레이(있는 테마만). 검정을 crush 한(요소만 남긴) 영상을
          mixBlendMode:lighten 으로 얹어 room.webp 는 100% 정지시키고 방보다 밝은 요소(나비·벚꽃)만 노출한다.
          (screen 은 방 전체를 핑크로 물들여 반려 — lighten=픽셀별 max 라 검정 영역은 방 원본 유지, v1 방 전체 움직임도 해소.)
          편집 중엔 성능 위해 숨김. 영상 자체를 라운딩(부모 클립 의존 금지 — 흰화면 사고 교훈).
          파일 없으면 AmbientVideo 계약상 아무것도 안 그려 위 room.webp 가 그대로 보인다. */}
      {!editing && (
        <AmbientVideo
          key={`vid-${activeCode}`}
          id={`shrine-theme-${activeCode}`}
          className={`absolute inset-0 w-full h-full object-cover pointer-events-none select-none${roundAll}`}
          style={{ mixBlendMode: 'lighten', opacity: 0.9 }}
        />
      )}
      {/* 제단 영역 대비용 하단 암전 */}
      <div
        className={`absolute inset-x-0 bottom-0 h-[38%]${roundBottom}`}
        style={{ background: 'linear-gradient(180deg,transparent,rgba(0,0,0,0.32))' }}
      />
      <div className="absolute inset-x-0 top-0 h-[3px] z-[2]" style={{ background: 'var(--th-top)' }} />
      {/* 제단 광원 — 폭이 방 대비 %라 큰 방에서는 2.4배로 퍼진다. 겉보기(뷰포트 64%)를 지킨다. */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 rounded-full${GAMEFEEL_V1 && !editing ? ' shrine-glow-breathe' : ''}`}
        style={{ top: '77%', width: scaleW(64), height: '16%', background: 'var(--th-glow)', filter: 'blur(7px)' }}
      />

      {/* 좌정한 主神 — 단상 위에 강림. 탭하면 한 바퀴 돈다(안2.3 ④).
          세로 정합(발이 단상 상면에 닿음)은 DeityTurn 이 stage.deityStandBox 로 파생한다. */}
      {scene.mainDeity?.spriteUrl && (
        <DeityTurn
          baseUrl={scene.mainDeity.spriteUrl}
          frames={deityFrames}
          name={scene.mainDeity.name}
          spinning={deitySpinning}
          onSpinEnd={onDeitySpinEnd}
          onTap={onTapDeity}
          // 게이트를 내리면 신위는 **탭 대상 자체가 사라진다**(종전 pointer-events-none 그대로) —
          // 원복 레버가 연출만 끄고 새 상호작용을 남기면 "되돌렸는데 손에 걸리는 것"이 생긴다(ARCH §8).
          // 모션 최소화는 여기서 끄지 않는다 — 회전만 생략하고 탭 반응은 남기는 것이 부록 C ④ 계약이다.
          interactive={GAMEFEEL_V1 && !editing}
          idleGlow={GAMEFEEL_V1 && !editing}
        />
      )}

      {/* L2 구조물 (stage 테마) / CSS 제단 박스 (레거시) — 큰 방에서는 w 만 겉보기 보정 */}
      <StageLayers
        stage={daecheongStage}
        themeCode={activeCode}
        slot="structures"
        zoned={worldActive}
        widthScale={stageScale}
      />

      {/* 존 가이드 (편집) */}
      {editing &&
        (Object.keys(ZONES) as Array<keyof typeof ZONES>).map((layer) => {
          const z = ZONES[layer]
          return (
            <div
              key={layer}
              className="absolute rounded-lg pointer-events-none"
              style={{
                left: `${z.x[0]}%`,
                right: `${100 - z.x[1]}%`,
                top: `${z.y[0]}%`,
                bottom: `${100 - z.y[1]}%`,
                border: '1.5px dashed rgba(201,168,76,0.32)',
              }}
            >
              <span className="absolute -top-px left-1.5 text-[8px] tracking-[0.15em] text-gold-300 px-1 rounded-sm bg-black/80">
                {ZONE_LABEL[layer]}
              </span>
            </div>
          )
        })}

      {/* 파티클 이펙트 */}
      <EffectsCanvas ref={effectsRef} />

      {/* 신당지기 — 좌정한 主神이 겸한다 (초상 오브, 없으면 🔮 폴백).
          큰 방에서는 바닥 위를 거닐고 입장 때 문간에서 걸어 들어온다(안2.2). 단일 무대는 KEEPER_POS 정위치. */}
      <WalkingKeeper
        portraitUrl={scene.mainDeity?.portraitUrl ?? null}
        deityName={scene.mainDeity?.name ?? null}
        range={keeperRange}
        y={KEEPER_POS.y}
        entrance={keeperEntrance}
        bounceKey={bounce}
        onTap={onTapKeeper}
        paused={keeperPaused || editing}
      />

      {/* 아이템 */}
      {placements.map((p) => {
        const item = catalogById.get(p.catalogItemId)
        if (!item) return null
        return (
          <Sprite
            key={p.id}
            placement={p}
            item={item}
            editing={editing}
            anchors={anchors}
            onTap={() => onTapItem(p)}
            onRemove={() => onRemove(p)}
            onDragEnd={(x, y, anchorId) => onDragEnd(p, x, y, anchorId)}
            onAnchorHover={onAnchorHover}
          />
        )
      })}

      {/* 조명 오버레이 (§3-C4) — 배경·구조물·아이템이 '같은 빛'을 받게 하는 컬러 그레이딩 한 장.
          아이템 최상단 밴드(z 29)와 같은 층에 두되 DOM 순서로 위에 얹고, UI 컨트롤(z-30) 아래에 둔다.
          soft-light: 어두운 방의 톤을 죽이지 않으면서 색만 입힌다(screen 은 대비를 날려 반려). */}
      <div
        aria-hidden
        className={`absolute inset-0 pointer-events-none shrine-light-overlay${roundAll}`}
        style={{ ...lightOverlay, mixBlendMode: 'soft-light', zIndex: 29 }}
      />

      {/* 앵커 스냅 하이라이트 (꾸미기) — 골드 링 */}
      {editing && snapAnchor && (
        <span
          aria-hidden
          className="absolute rounded-full pointer-events-none shrine-anchor-ring"
          style={{
            left: `${snapAnchor.x}%`,
            top: `${snapAnchor.y}%`,
            width: '34px',
            height: '34px',
            marginLeft: '-17px',
            marginTop: '-17px',
            border: '2px solid #C9A84C',
            boxShadow: '0 0 12px rgba(201,168,76,0.55)',
            zIndex: 29,
          }}
        />
      )}

      {/* 공명 링 */}
      {rings.map((r) => (
        <span
          key={r.id}
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none z-[50] shrine-ring"
          style={{ left: `${r.x}%`, top: `${r.y}%`, border: `2px solid ${r.color}` }}
        />
      ))}
    </>
  )

  return (
    <div className="w-full max-w-[520px] mx-auto" style={themeVars(activePack)}>
      {/* 헤더 */}
      <div className="flex items-center justify-between px-1 pb-2.5">
        <div>
          <p className="text-[9px] tracking-[0.32em] text-gold-dim font-serif">
            {scene.familyMemberId ? '가 족 신 당' : '나 의 신 당'}
          </p>
          <h1 className="text-base font-serif font-bold text-ink-primary">{scene.shrineName}</h1>
        </div>
        <div className="flex items-center gap-2">
          {isOwner && (
            <Link
              href={deitiesHref}
              className="h-8 px-2.5 rounded-[10px] flex items-center gap-1.5 bg-gold-500/[0.12] border border-gold-500/40 text-gold-200 text-[11.5px] font-serif font-bold"
              aria-label="신위전"
            >
              <Sparkles className="w-3.5 h-3.5" />
              신위
            </Link>
          )}
          {isOwner && (
            <button
              onClick={() => void toggleVisibility()}
              disabled={visibilitySaving}
              aria-label={visibility === 'public' ? '신당 비공개로 전환' : '신당 공개로 전환'}
              title={visibility === 'public' ? '공개 중 — 눌러서 비공개' : '비공개 — 눌러서 공개'}
              className="h-8 px-2 rounded-[10px] flex items-center gap-1 bg-surface border border-gold-500/25 text-gold-300 text-[10px] disabled:opacity-50"
            >
              {visibility === 'public' ? '공개' : '비공개'}
            </button>
          )}
          <button
            onClick={toggleMute}
            aria-label={muted ? '소리 켜기' : '소리 끄기'}
            className="w-8 h-8 rounded-[10px] grid place-items-center bg-surface border border-gold-500/25 text-gold-300"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          {isOwner && (
            <Link
              href="/protected/shrine/setup"
              className="w-8 h-8 rounded-[10px] grid place-items-center bg-surface border border-gold-500/25 text-gold-300"
              aria-label="설정"
            >
              <Settings className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      {/* 主神 인연(緣) 스트립 — 소유자 전용 (방문자는 RLS로 인연 조회 불가 → 0점 오표시 방지) */}
      {scene.mainDeity &&
        (() => {
          const deity = scene.mainDeity
          if (deity.bondPoints === null) return null
          const bp = bondProgress(deity.bondPoints)
          const lower = BOND_THRESHOLDS[bp.level - 1] ?? 0
          const ratio =
            bp.nextThreshold === null
              ? 1
              : Math.max(0.04, Math.min(1, (bp.points - lower) / Math.max(1, bp.nextThreshold - lower)))
          return (
            <Link
              href={deitiesHref}
              className="flex items-center gap-2 px-2.5 py-1.5 mb-2 rounded-[10px] bg-surface/60 border border-gold-500/20"
            >
              <span className="text-[11px] font-serif text-gold-200 whitespace-nowrap">主神 {deity.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gold-500/15 text-gold-300 font-serif whitespace-nowrap">
                緣 {BOND_LEVEL_NAMES[bp.level]}
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-ink-primary/15 overflow-hidden">
                <div className="h-full rounded-full bg-gold-500 transition-all" style={{ width: `${ratio * 100}%` }} />
              </div>
              <span className="text-[9.5px] text-ink-primary/40 whitespace-nowrap tabular-nums">
                {bp.nextThreshold === null ? '지음' : `다음 ${bp.toNext}`}
              </span>
            </Link>
          )
        })()}

      {/* 기원(祈願) 스트립 — 매일 기도로 단 상승 → 테마·신물 해금 (소유자 전용) */}
      {isOwner && devotion && <DevotionStrip devotion={devotion} />}

      {/* 룸 */}
      <div
        className={`room relative rounded-[18px] ${editing ? 'editing' : ''} ${cin.roomClassName}`}
        {...bindRoom}
        style={{
          // 방 높이 — min(56vh,480px) → **min(72vh,620px)** (부록 C ③ "상하단으로 조금 더 길어도 됨").
          // 세로가 29% 늘어나면 제단·단상·신위의 위계가 살고 걸이/벽/바닥 존도 넉넉해진다.
          // 세로 % 값들은 전부 방 높이 비례라 함께 늘어난다(광원 타원·암전·존 가이드 = 의도 유지).
          // 유일한 하드코딩이던 신위 접지는 단상 상면 파생(stage.deityStandBox)으로 옮겼다.
          height: 'min(72vh, 620px)',
          border: '1px solid var(--th-frame, rgba(201,168,76,0.3))',
          // ⚠️ overflow:hidden 미사용(고의): 둥근 클립+overflow-hidden이 내부 <canvas>·큰 이미지를 GPU 마스크로
          //    합성하다 고DPR 실기기에서 실패→흰 화면이 되던 근본 원인. 대신 다크 배경색으로 폴백을 안전하게
          //    (이미지 실패 시에도 흰색이 아닌 다크 방) + 전면 레이어를 개별 라운딩해 모서리 유지.
          backgroundColor: '#1a1308',
          // 편집 중에만 드래그 배치를 위해 스크롤 차단. 평소엔 세로 스크롤 허용(방 위 스와이프로 페이지 이동).
          touchAction: editing ? 'none' : 'pan-y',
          // 두루마리 전용 — 가로 넘침만 자르고(clip 은 스크롤 컨테이너를 만들지 않아 세로 visible 과 공존한다)
          // 카메라 변수를 방 루트에 얹는다. 단일 무대·레거시에는 아무것도 더하지 않는다(위 흰화면 전례 회피).
          ...(worldActive ? { overflowX: 'clip' as const, ...cam.layerVar, ...worldVars } : null),
          // 시네마틱 카메라(transform/transition). 평시엔 동결된 빈 객체라 위 값들에 영향이 없다.
          ...cin.roomStyle,
        }}
      >
        {worldActive ? (
          <>
            {/* 원경(0.3x) — 하늘·담장 실루엣. 에셋 없이 CSS 그라디언트만으로 깊이를 만든다 */}
            <div aria-hidden className="absolute inset-y-0 left-0 pointer-events-none" style={farStyle} />

            {/* 무대층(1.0x) — 구역별 세트 + 대청 한 덩어리 */}
            <div className="absolute inset-y-0 left-0" style={cam.worldStyle}>
              {scenery.map((z) => (
                <div key={z.code} aria-hidden className="absolute inset-y-0 pointer-events-none" style={z.box}>
                  <StageLayers stage={z.stage} themeCode={activeCode} slot="ground" zoned tile={z.tile} />
                  <StageLayers stage={z.stage} themeCode={activeCode} slot="structures" zoned widthScale={z.scale} />
                </div>
              ))}
              {/* 가족 사랑방 — world 우측 영역 박스를 100% 채운다(안쪽 좌표는 FamilyHall 이 % 로 자립).
                  구역 세트(z auto)보다 위·아이템 대역(10~29)보다 아래라 방 콘텐츠와 층이 섞이지 않는다.
                  scenery 와 달리 pointer-events 를 살린다 — 좌석 탭이 이 방의 유일한 상호작용이다.
                  (팬 제스처는 룸이 캡처 단계에서 가로채므로 좌석 위에서 끌어도 카메라가 따라온다.) */}
              {hallBox && hall && (
                <div className="absolute inset-y-0" style={hallBox}>
                  {/* 꾸미기 모드에서는 좌석도 끌어 옮긴다 — 좌석 좌표 저장은 사랑방이 스스로 한다
                      (룸의 「완료」 저장은 신물 배치 전용이라 좌석이 끼어들 자리가 없다) */}
                  <FamilyHall data={hall} editing={editing} />
                </div>
              )}
              <div className="absolute inset-y-0" style={daecheongBox}>
                {stageContent}
              </div>
            </div>

            {/* 전경(1.15x) — 대청 문틀 그림자. 카메라보다 빨리 흘러 "안쪽에 서 있다"를 만든다 */}
            <div aria-hidden className="absolute inset-y-0 left-0 pointer-events-none" style={nearStyle}>
              <span className="absolute inset-y-0" style={jambStyle('left')} />
              <span className="absolute inset-y-0" style={jambStyle('right')} />
            </div>
          </>
        ) : (
          stageContent
        )}

        {/* 구역 미니맵 — 상단 배지 아래 가운데. 두루마리일 때만 (구역 1개면 스스로 그리지 않는다) */}
        {worldActive && (
          <div className="absolute top-[26px] left-1/2 -translate-x-1/2 z-30">
            <CameraMinimap
              world={world}
              camX={cam.camX}
              onSelect={(x) => {
                panSource.current = 'user'
                panTo(x)
              }}
            />
          </div>
        )}

        {/* 상단 컨트롤 */}
        {isOwner && (
          <button
            onClick={toggleEdit}
            disabled={saving}
            className="absolute top-2.5 left-2.5 z-30 text-[10.5px] font-bold tracking-[0.05em] px-3 py-1.5 rounded-full flex items-center gap-1 disabled:opacity-50"
            style={{ background: 'rgba(201,168,76,0.16)', border: '1px solid rgba(201,168,76,0.55)', color: '#f4e4ba' }}
          >
            {editing ? <Check className="w-3 h-3" /> : <Wrench className="w-3 h-3" />}
            {editing ? (saving ? '저장 중…' : '완료') : '꾸미기'}
          </button>
        )}
        {/* 우상단 HUD — 소원 배지 하나만 남긴다.
            (실기기 검수: TODAY 방문자 수·전체화면 버튼은 방을 보는 데 쓰이지 않아 걷어냈다) */}
        <div className="absolute top-2.5 right-2.5 z-30 flex items-center gap-1.5">
          <div
            className="text-[8.5px] tracking-[0.06em] px-2 py-[3px] rounded-full text-ink-primary/75 tabular-nums"
            style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            소원 <b style={{ color: 'var(--th-accent)' }}>{scene.wishCount}</b>
          </div>
        </div>

        {/* 신당지기 말풍선 — **룸 직계 HUD**(카메라 밖). 신탁 선톡이면 강조.
            world 안(대청 박스)에 있던 동안은 팬하면 화면 밖으로 잘리고 「꾸미기」 버튼과 겹쳤다(2차 검수).
            신당지기가 거닐기 시작한 뒤로는 붙일 앵커도 없어져 화면 고정 대사창으로 옮겼다 —
            상단은 꾸미기(top-2.5 left-2.5)·소원 배지(top-2.5 right-2.5)·미니맵(top-26px, 44px 터치)이
            이미 차지해 남는 안전 구역이 하단뿐이다. pointerEvents 를 끊어 팬 제스처·미니맵 탭을 가리지 않는다. */}
        {!editing && (
          <div
            className="absolute left-2.5 right-2.5 bottom-2.5 z-30 pointer-events-none text-[11px] leading-snug px-3 py-1.5 rounded-[3px_12px_12px_12px] backdrop-blur-sm transition-all"
            style={{
              background: oracle ? 'rgba(26,18,6,0.92)' : 'rgba(10,10,8,0.8)',
              border: oracle ? '1px solid rgba(212,175,55,0.65)' : '1px solid var(--th-accent)',
              boxShadow: oracle ? '0 0 16px rgba(212,175,55,0.25)' : undefined,
            }}
          >
            <div
              className="text-[9px] tracking-[0.24em] mb-0.5 flex items-center gap-1"
              style={{ color: oracle ? '#E8D5A0' : 'var(--th-accent)' }}
            >
              {oracle && <span className="text-[8px]">✦ 신탁 ✦</span>}
              {scene.mainDeity ? `신당지기 · ${scene.mainDeity.name}` : '신당지기'}
            </div>
            <span dangerouslySetInnerHTML={{ __html: bubble }} />
          </div>
        )}
        {editing && (
          <div
            className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 text-[9px] tracking-[0.08em] text-gold-300 px-2.5 py-[3px] rounded-full whitespace-nowrap"
            style={{ background: 'rgba(10,10,8,0.75)', border: '1px solid rgba(201,168,76,0.4)' }}
          >
            드래그로 배치 · ✕로 수납 · 공물은 신당지기에게
          </div>
        )}

        {/* 시네마틱 오버레이(암전·빛줄기·스킵 탭) — 룸 직계 자식. z-40 이라 룸 최상 UI(z-30) 위를 덮고,
            재생 중에만 pointerEvents 를 받아 아이템·신당지기 탭이 자동으로 막힌다(추가 차단 불필요). */}
        {cin.overlay}
      </div>

      {/* 테마 칩 + 수집 진행(F-8) */}
      {isOwner && (
        <div className="px-1 pt-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-sans text-[10px] text-ink-light/40">테마 수집</span>
            <span className="font-serif text-[10px] font-bold text-gold-500 tabular-nums">
              {ownedThemeCount}/{scene.themes.length}
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {scene.themes.map((t) => {
              const owned = t.owned || purchasedCodes.has(t.code)
              const rewardLvl = !owned ? devotionLevelForTheme(t.code) : null
              const reached = rewardLvl != null && devotion != null && devotion.level >= rewardLvl
              return (
                <button
                  key={t.code}
                  onClick={() => onSelectTheme(t)}
                  className={`flex-shrink-0 rounded-full px-3 py-1.5 font-sans text-[11px] transition-all ${
                    t.code === activeCode
                      ? 'border border-gold-500 bg-gold-500/[0.14] text-gold-300'
                      : owned
                        ? 'border border-white/10 bg-surface text-ink-light/50'
                        : 'border border-white/5 bg-surface/50 text-ink-light/30 opacity-60'
                  }`}
                >
                  {!owned && <Lock className="mr-1 -mt-0.5 inline h-2.5 w-2.5" />}
                  {t.name}
                  <span className="ml-1 text-[9.5px] tabular-nums opacity-70">
                    {owned ? '보유' : t.priceBokchae > 0 ? `복채 ${t.priceBokchae}만냥` : '무료'}
                  </span>
                  {rewardLvl != null && (
                    <span className={`ml-1 text-[9px] ${reached ? 'text-seal font-bold' : 'text-gold-500/70'}`}>
                      · 기원 {rewardLvl}단{reached ? ' 수령가능' : ' 무료'}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* 기운 게이지 */}
      {isOwner && (
        <div className="mt-3 px-1">
          <div className="flex justify-between items-baseline mb-2">
            <span className="font-serif text-[13px] font-bold tracking-[0.1em] text-ink-primary">氣運 균형</span>
            <span className="text-[10.5px] px-2 py-[3px] rounded-sm bg-gold-500/[0.12] border border-gold-500/35 text-gold-300">
              필요 기운 <b className="font-serif text-gold-500">{EL_KO[displayYongsin]}</b>
            </span>
          </div>
          <div className="flex gap-1.5">
            {ELEMENTS.map((el) => {
              const low = el === displayYongsin
              return (
                <div key={el} className="flex-1 text-center">
                  <div
                    className="h-[46px] rounded-md relative overflow-hidden"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: low ? '1px solid rgba(201,168,76,0.55)' : '1px solid rgba(255,255,255,0.06)',
                      boxShadow: low ? '0 0 10px rgba(201,168,76,0.15)' : 'none',
                    }}
                  >
                    <div
                      className="absolute inset-x-0 bottom-0 rounded-t-md transition-[height] duration-500"
                      style={{ height: `${energy[el]}%`, background: EL_COLOR[el] }}
                    />
                  </div>
                  <div className="font-serif text-[12px] mt-1 text-ink-primary/75">{EL_KO[el]}</div>
                  <div className="text-[10px] text-ink-light/40 tabular-nums">{energy[el]}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 하단 독 */}
      {isOwner ? (
        editing ? (
          <div className="mt-3 px-1 pb-6 relative">
            <div
              className="rounded-[14px] p-3"
              style={{ background: '#1e1b15', border: '1px solid rgba(201,168,76,0.4)' }}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] tracking-[0.14em] text-gold-dim">보관함 — 탭하여 꺼내기</span>
                <Link
                  href="/protected/store?tab=items"
                  className="text-[10px] font-bold text-gold-300 border border-gold-500/40 rounded-full px-2.5 py-1"
                >
                  ＋ 신물 구하기
                </Link>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pt-1.5">
                {available.length === 0 && (
                  <span className="text-[11px] text-ink-light/30 py-3">
                    보관함이 비었어요 · 상점에서 신물을 구해보세요
                  </span>
                )}
                {available.map(({ item, qty }) => (
                  <button
                    key={item.id}
                    onClick={() => onPlaceFromTray(item)}
                    className="relative flex-shrink-0 w-[46px] h-[46px] rounded-[10px] grid place-items-center text-[22px] bg-black/30 border border-gold-500/25"
                    title={`${item.name} (${ZONE_LABEL[item.layer]})`}
                  >
                    {item.spriteUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.spriteUrl} alt="" className="w-[34px] h-[34px] object-contain" draggable={false} />
                    ) : (
                      item.emoji
                    )}
                    {item.element && (
                      <span
                        className="absolute -top-1.5 -right-1.5 w-[13px] h-[13px] rounded-full text-[7.5px] font-serif grid place-items-center font-bold"
                        style={{
                          background: EL_COLOR[item.element],
                          color: item.element === 'fire' || item.element === 'water' ? '#f2dcdc' : '#0a0a08',
                        }}
                      >
                        {EL_KO[item.element]}
                      </span>
                    )}
                    <span
                      className="absolute -bottom-1 -right-1 text-[8.5px] font-bold min-w-[15px] text-center rounded-full px-1 tabular-nums text-[#f2dcdc]"
                      style={{ background: '#9e2b2b' }}
                    >
                      ×{qty}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null
      ) : (
        <div className="mt-3 px-1 pb-6">
          <Link
            href="/protected/shrine"
            className="flex items-center justify-center gap-2 rounded-[14px] px-4 py-3.5 bg-gold-500/[0.1] border border-gold-500/30 text-gold-300 text-sm font-serif font-bold"
          >
            🏮 나만의 신당 만들기
          </Link>
        </div>
      )}

      {/* 하이브리드 가이드 — 우하단 主神 말풍선 + 할 일 슬림 바 */}
      <ShrineGuideBar
        neededElementKo={EL_KO[displayYongsin]}
        neededElementPlaced={neededElementPlaced}
        mainDeitySeated={!!scene.mainDeity}
        isOwner={isOwner}
      />
    </div>
  )
}

// ─── 개별 아이템 스프라이트 ──────────────────────────────────
interface SpriteProps {
  placement: StagePlacement
  item: StageCatalogItem
  editing: boolean
  /** 스냅 후보 앵커 (무대 구조물 anchors 합집합 / 레거시 기본 앵커) */
  anchors: readonly StageAnchor[]
  onTap: () => void
  onRemove: () => void
  onDragEnd: (x: number, y: number, anchorId: string | null) => void
  onAnchorHover: (a: StageAnchor | null) => void
}

const SIZE_PX: Record<string, string> = { sm: '23px', md: '29px', lg: '35px' }
/** v2「설빛온기」스프라이트 표시 크기 em (512² 캔버스에 여백을 둔 규격이라 크게 잡는다) */
const ASSET_EM = 3.2
/** 레거시 스프라이트 표시 크기 em — 기존 값 그대로 (회귀 0) */
const LEGACY_SPRITE_EM = 1.55
/** 점화 글로우 지름 = 스프라이트 크기 × 이 배수 */
const LIT_GLOW_SCALE = 1.8

function Sprite({ placement, item, editing, anchors, onTap, onRemove, onDragEnd, onAnchorHover }: SpriteProps) {
  const ref = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLSpanElement>(null)
  const dragging = useRef(false)
  const moved = useRef(false)
  const posRef = useRef({ x: placement.x, y: placement.y })
  const snapRef = useRef<StageAnchor | null>(null)

  /**
   * 원근 스케일 합성 — 중심 정렬 translate + 깊이 스케일 + flip.
   * transform-origin 을 바닥(50% 100%)에 둬야 커져도 발이 바닥에 붙어 있다.
   */
  const transformFor = useCallback(
    (y: number) =>
      `translate(-50%, -50%) scale(${depthScale(item.layer, y).toFixed(3)})${placement.flip ? ' scaleX(-1)' : ''}`,
    [item.layer, placement.flip]
  )

  const onPointerDown = useCallback(
    (e: RPointerEvent<HTMLDivElement>) => {
      if (!editing) return
      e.preventDefault()
      // 두루마리 카메라와의 3자 조정(ARCH §4) — 아이템에서 시작한 편집 드래그가 룸 팬으로 새면 안 된다.
      // 팬은 빈 무대에서만. 보기 모드는 여기까지 오지 않으므로 탭 위 팬(관성+클릭 가드)은 그대로 산다.
      e.stopPropagation()
      const el = ref.current
      // 두루마리에서는 대청 박스가, 단일 무대에서는 방이 부모다 — 둘 다 좌표계가 뷰포트와 1:1 이라 환산이 같다
      const room = el?.parentElement
      if (!el || !room) return
      dragging.current = true
      moved.current = false
      snapRef.current = null
      el.setPointerCapture(e.pointerId)
      el.style.zIndex = '60'
      const zone = ZONES[item.layer]
      const rect = room.getBoundingClientRect()

      const move = (ev: PointerEvent) => {
        if (!dragging.current) return
        moved.current = true
        const rawX = clampPct(((ev.clientX - rect.left) / rect.width) * 100, zone.x)
        const rawY = clampPct(((ev.clientY - rect.top) / rect.height) * 100, zone.y)
        // 앵커 반경 안이면 자석 스냅 — 밖이면 자유 배치 그대로 (앵커는 보너스이지 제약이 아니다)
        const snap = nearestAnchor(anchors, item.layer, rawX, rawY)
        const x = snap ? snap.x : rawX
        const y = snap ? snap.y : rawY
        posRef.current = { x, y }
        el.style.left = `${x}%`
        el.style.top = `${y}%`
        el.style.transform = transformFor(y)
        if (item.layer === 'floor') el.style.zIndex = String(depthZ(item.layer, y))
        if ((snapRef.current?.id ?? null) !== (snap?.id ?? null)) {
          snapRef.current = snap
          onAnchorHover(snap)
        }
      }
      const up = () => {
        dragging.current = false
        el.removeEventListener('pointermove', move)
        el.removeEventListener('pointerup', up)
        el.removeEventListener('pointercancel', up)
        const snapped = snapRef.current
        snapRef.current = null
        onAnchorHover(null)
        // 드래그용 임시 z(60)를 React 가 알고 있는 값으로 되돌린다
        // (다음 렌더에서 zIndex prop 이 그대로면 React 가 DOM 을 쓰지 않아 60 이 남는다)
        el.style.zIndex = String(depthZ(item.layer, posRef.current.y))
        if (moved.current) onDragEnd(posRef.current.x, posRef.current.y, snapped?.id ?? null)
      }
      el.addEventListener('pointermove', move)
      el.addEventListener('pointerup', up)
      el.addEventListener('pointercancel', up)
    },
    [editing, item.layer, anchors, onDragEnd, onAnchorHover, transformFor]
  )

  /**
   * 탭 반응 — 게임필 v1 은 스쿼시&스트레치, 게이트 오프면 기존 흔들림.
   * 래퍼가 아닌 내부 span 에 걸어 원근 transform 을 덮지 않는다.
   * (TAP_CLASS 는 idle 살랑임보다 뒤에 선언돼 있어, 붙어 있는 동안 idle animation 을 이긴다)
   */
  const wiggle = useCallback(() => {
    const el = bodyRef.current
    if (!el) return
    el.classList.remove(TAP_CLASS)
    void el.offsetWidth // 리플로우 강제 → 연속 탭에도 애니메이션 재시작
    el.classList.add(TAP_CLASS)
  }, [])

  const lit = placement.state.lit === true
  /** 상시 idle — 편집 중엔 끈다(드래그 좌표와 회전이 싸운다) */
  const idle = GAMEFEEL_V1 && !editing
  /**
   * 개체별 위상차. 배치 좌표에서 파생한 **결정론** 값이라 SSR·클라가 같다(Math.random 금지 — 하이드레이션).
   * 음수 지연이라 첫 프레임부터 주기 중간에서 시작한다(일제히 움직이는 어색함 제거).
   */
  const idleDelay = `-${((placement.x * 7 + placement.y * 13) % 5.5 || 0).toFixed(2)}s`
  const bodyStyle: CssVars = { display: 'inline-block', '--shrine-idle-delay': idleDelay }
  const zIndex = depthZ(item.layer, placement.y)
  const shadow = groundShadow(item.layer, placement.y)
  // ⚠️ scene.ts 는 asset_url 이 비면 sprite_url 로 폴백한다 → 둘이 같으면 아직 레거시 스프라이트다.
  //    이때 v2 크기(3.2em)를 쓰면 기존 신당의 모든 신물이 2배로 커진다(회귀). 다를 때만 v2 규격.
  const spriteSrc = item.assetUrl ?? item.spriteUrl
  const spriteEm = item.assetUrl && item.assetUrl !== item.spriteUrl ? ASSET_EM : LEGACY_SPRITE_EM
  const spriteSize = `${spriteEm}em`
  const glowEm = spriteEm * LIT_GLOW_SCALE
  /** 인라인 리터럴로 두면 CSS 변수가 CSSProperties 초과 속성으로 걸린다 — 변수로 받아 좁힌다 */
  const glowStyle: CssVars = {
    '--shrine-idle-delay': idleDelay,
    width: `${glowEm}em`,
    height: `${glowEm}em`,
    marginLeft: `${-glowEm / 2}em`,
    marginTop: `${-glowEm / 2}em`,
    background: 'radial-gradient(circle, rgba(201,168,76,0.5) 0%, rgba(201,168,76,0.2) 42%, rgba(201,168,76,0) 72%)',
    // 래퍼가 스택 컨텍스트라 -1 은 아이템 뒤로만 간다 (접지 그림자와 같은 규약)
    zIndex: -1,
  }

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onClick={() => {
        if (editing || moved.current) return
        wiggle()
        onTap()
      }}
      className="absolute select-none"
      style={{
        left: `${placement.x}%`,
        top: `${placement.y}%`,
        fontSize: SIZE_PX[item.size] ?? '29px',
        lineHeight: 1,
        zIndex,
        transform: transformFor(placement.y),
        transformOrigin: '50% 100%',
        cursor: editing ? 'grab' : 'pointer',
        filter: lit
          ? 'drop-shadow(0 0 7px rgba(244,228,186,0.95)) drop-shadow(0 0 15px rgba(201,168,76,0.5))'
          : 'drop-shadow(0 3px 3px rgba(0,0,0,0.55))',
      }}
    >
      {/* 점화 광원 — 아이템 뒤에서 맥동한다. filter 애니는 금지 규율(합성 레이어 유지)이라
          위 정적 drop-shadow 는 그대로 두고 여기서는 opacity 만 움직인다. */}
      {lit && idle && (
        <span
          aria-hidden
          className="shrine-idle-glow absolute left-1/2 top-1/2 rounded-full pointer-events-none"
          style={glowStyle}
        />
      )}
      <span
        ref={bodyRef}
        // 전 층 상시 idle — 걸이 살랑·벽 미세 살랑·바닥/제단 숨쉬기 (위상차는 --shrine-idle-delay)
        className={idle ? IDLE_CLASS[item.layer] : undefined}
        style={bodyStyle}
        onAnimationEnd={(e) => e.currentTarget.classList.remove(TAP_CLASS)}
      >
        {spriteSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={spriteSrc}
            alt={item.name}
            draggable={false}
            decoding="async"
            style={{ display: 'inline-block', width: spriteSize, height: spriteSize, objectFit: 'contain' }}
          />
        ) : (
          item.emoji
        )}
      </span>
      {/* 접지 그림자 — 아이템과 한 래퍼라 함께 이동·함께 스케일된다 ("떠 있음" 해소) */}
      {shadow && (
        <span
          className="absolute left-1/2 rounded-full pointer-events-none"
          style={{
            // 타원 중심을 아이템 밑동에 걸쳐 '닿아 있는' 접지로 보이게 (완전히 아래로 내리면 다시 떠 보인다)
            bottom: `${-shadow.height / 2}em`,
            width: `${shadow.width}em`,
            height: `${shadow.height}em`,
            marginLeft: `${-shadow.width / 2}em`,
            background: `radial-gradient(ellipse at center, rgba(0,0,0,${shadow.opacity}) 0%, rgba(0,0,0,${(shadow.opacity * 0.55).toFixed(3)}) 55%, rgba(0,0,0,0) 78%)`,
            filter: 'blur(1.5px)',
            // 래퍼가 이미 스택 컨텍스트(숫자 z-index)라 -1 은 아이템 뒤로만 간다 (방 배경까지 내려가지 않음)
            zIndex: -1,
          }}
        />
      )}
      {editing && (
        <span
          role="button"
          aria-label="수납"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="absolute -top-2.5 -left-2.5 w-[17px] h-[17px] rounded-full grid place-items-center text-[9px] cursor-pointer text-[#f2dcdc] leading-none"
          style={{ background: '#9e2b2b', border: '1px solid rgba(0,0,0,0.4)' }}
        >
          ✕
        </span>
      )}
    </div>
  )
}
