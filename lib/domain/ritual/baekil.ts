/**
 * 백일기도(百日祈禱) 도메인 — 의식 R-3 (PRD-shrine-rituals-v1 §3).
 *
 * 전 함수 순수(side-effect 0) · 결정론. 시각은 호출자가 epochMs·KST 날짜키로 주입한다
 * (SSR·클라 동일 결과 = 하이드레이션 불일치 0 — aekmak.ts·obangki.ts 와 같은 규약).
 *
 * ⚠️ 백일기도는 **새 게이지가 아니다.** 기존 기원(祈願, lib/domain/shrine/devotion.ts) 위에 얹는
 *    「서약 회차 뷰」다(PRD §3 구조 개선의 핵심). 진행도는 서약 시점의 누적 기도일을 스냅샷으로
 *    떠 두고 `현재 누적 − 스냅샷` 으로 파생한다 — 일별 기록 테이블도, 새 데일리 액션도 만들지 않는다.
 *    하루 중복 적립 방지는 기원 쪽(record_shrine_devotion 의 KST 멱등)이 이미 하고 있으므로
 *    여기서 다시 세지 않는다. 같은 규칙을 두 곳에 두면 자정 경계가 갈린다.
 *
 * ⚠️ 사용자가 쓴 **소원 원문은 어디에도 저장하지 않는다**(액막이·오방기와 같은 원칙).
 *    스키마에 텍스트 컬럼을 만들지 않는 것으로 강제한다(supabase/migrations/20260730_shrine_vows.sql).
 *    PRD §3 은 실물 굿 제작용으로 `wish_text` 를 열어 두었으나 실물 굿 O2O 가 보류(CEO 확정)되어
 *    수집 사유 자체가 사라졌다 — 축원 영상 개인화는 이름·회차·완주일만 쓴다.
 *
 * ⚠️ 문구는 **의료·심리 효능을 주장하지 않는다**(표시광고법 L-트랙 기준).
 *    금지 어휘는 테스트가 강제한다(__tests__/baekil.test.ts).
 *
 * KST 날짜 규약(kstDayKey)은 액막이가 이미 정한 의식 공통 규약이라 그대로 가져다 쓴다.
 */

import { hashSeed, kstDayKey } from './aekmak'

// ─── 정책 상수 ────────────────────────────────────────────────

/** 한 회차의 목표 기도일. DB 기본값(shrine_vows.target_days)과 **같아야 한다**. */
export const BAEKIL_TARGET_DAYS = 100

/**
 * 마지막 기도로부터 이만큼(KST 일) 지나면 '휴면'으로 본다 — PRD §3 "서약 후 30일 무기도 시 안부 신탁".
 * 휴면은 **실패가 아니다.** 서약을 끝내지도, 쌓인 날을 깎지도 않는다(아래 수명 규칙 ①).
 */
export const BAEKIL_DORMANT_DAYS = 30

/**
 * 완주 보상으로 지급하는 신당 걸이 아이템 — `shrine_item_catalog.name`.
 *
 * 카탈로그에 code 컬럼이 없어 이름이 안정 키다(devotion.ts 의 DEVOTION_REWARDS 와 같은 규약).
 * 지급 RPC(complete_shrine_vow) 가 이 이름으로 카탈로그를 찾으므로 마이그레이션 시드와
 * 한 글자도 달라선 안 된다 — 대조는 테스트가 한다.
 */
export const BAEKIL_ITEM_NAME = '백일 소원끈'

/** 법무 고지 — 효능이 아니라 전통 의식임을 명시한다(액막이 고지와 같은 기준). */
export const BAEKIL_DISCLAIMER = '재미로 즐기는 전통 의식 놀이입니다. 의학적·심리적 상담을 대신하지 않습니다.'

/** 서약 화면 고지 — 소원을 받아 적지 않는다는 약속을 먼저 말한다. */
export const BAEKIL_PRIVACY_NOTICE = '적어 두신 소원은 나의 신당 기록에만 남습니다 — 남에게 보내지 않습니다.'

/** GA4 이벤트명 — PRD §3 확정. 화면이 trackEvent 로 찍을 때 이 상수를 쓴다(이름이 갈리지 않게). */
export const BAEKIL_GA = Object.freeze({
  start: 'vow_start',
  complete: 'vow_complete',
  videoView: 'vow_video_view',
})

// ─── 서약의 수명 — 끊김·재서약 규칙 ───────────────────────────
//
// PRD §3 이 정한 것:
//   · 진행도는 **누적**이다(연속 스트릭이 아니다). 며칠 쉬어도 이미 쌓인 날은 줄지 않는다.
//   · **실패가 없다.** 서약에 만료일을 두지 않는다 — 100일치 기도가 쌓이는 날이 완주일이다.
//   · 서약 후 30일 무기도면 '휴면'으로 보고 안부 신탁(기존 oracle)을 띄운다. 휴면은 서약을 끝내지 않는다.
//
// PRD 가 침묵해 여기서 정한 것(근거를 함께 남긴다):
//   ① **자진 파기(포기) 기능을 두지 않는다.**
//      실패가 없고 활성 서약이 1건뿐이라 파기의 유일한 실익은 "새로 시작"인데, 새 서약은 스냅샷을
//      지금 값으로 다시 잡으므로 **이미 쌓은 날이 통째로 사라진다**. 사용자에게 손해만 남는
//      되돌릴 수 없는 버튼이라 아예 만들지 않는다 — 도메인에 'abandoned' 상태가 없는 이유다.
//   ② **스냅샷은 서약을 누른 순간의 누적일이다 — 이월하지 않는다.**
//      완주 후 재서약을 미룬 동안의 기도일을 다음 회차로 넘기면, 오래 기도해 온 사람이 재서약
//      즉시 여러 회차를 한꺼번에 완주해 트로피가 쏟아진다. 서약은 자동 갱신 구독이 아니라
//      "지금부터 백 일"이라는 약속이므로 이월을 막는다.
//   ③ **넘친 날수도 이월하지 않는다.** 102일째 완주를 눌러도 다음 회차는 0일에서 시작한다(②와 같은 이유).
//   ④ **활성 서약은 사용자당 1건.** DB 부분 UNIQUE(user_id) WHERE completed_at IS NULL 로 강제한다.
//      완주해야 다음 회차가 열린다 — 회차를 병렬로 굴려 트로피를 늘리는 길이 없다.

/** 한 회차의 서약 — DB(shrine_vows) 한 행의 도메인 표현. 시각은 전부 epochMs. */
export interface VowRecord {
  /** 회차(1부터). DB 는 (user_id, round) UNIQUE. */
  round: number
  /** 서약 시점의 기원 누적일. 진행도의 기준선. */
  devotionSnapshot: number
  /** 이 회차의 목표일(보통 100). 과거 회차가 다른 목표로 걸렸어도 그 행의 값을 쓴다. */
  targetDays: number
  /** 서약 시각 */
  startedAtMs: number
  /** 완주 시각. null 이면 진행 중. */
  completedAtMs: number | null
}

/** 서약의 국면 — 화면이 무엇을 그릴지 이 하나로 갈린다. */
export type VowPhase =
  /** 활성 서약 없음 — 서약 버튼 */
  | 'none'
  /** 진행 중 */
  | 'active'
  /** 진행 중이나 마지막 기도가 30일 넘게 지났다 — 안부 신탁 */
  | 'dormant'
  /** 100일이 찼다 — 완주 의식 대기 */
  | 'ready'
  /** 완주 처리됨 */
  | 'completed'

function toInt(value: number, min = 0): number {
  return Number.isFinite(value) ? Math.max(min, Math.floor(value)) : min
}

// ─── 진행도 (기원 누적일에서 파생) ────────────────────────────

/**
 * 이 회차가 쌓은 날수 — `현재 누적 − 스냅샷` 을 0~목표로 클램프한다.
 *
 * 스냅샷이 현재 누적보다 큰 경우(데이터 이상)는 0으로 접는다. 음수 진행도를 화면에 흘리면
 * 게이지가 뒤집히고 완주 판정이 무의미해진다.
 */
export function vowEarnedDays(vow: VowRecord, totalDays: number): number {
  const target = toInt(vow.targetDays, 1)
  const earned = toInt(totalDays) - toInt(vow.devotionSnapshot)
  return Math.max(0, Math.min(target, earned))
}

/** 목표까지 남은 날수. 0이면 완주 조건 충족. */
export function vowRemainingDays(vow: VowRecord, totalDays: number): number {
  return Math.max(0, toInt(vow.targetDays, 1) - vowEarnedDays(vow, totalDays))
}

/** 진행률 0~100(정수). 백일초 높이·게이지 폭이 이 값을 쓴다. */
export function vowPercent(vow: VowRecord, totalDays: number): number {
  const target = toInt(vow.targetDays, 1)
  return Math.round((vowEarnedDays(vow, totalDays) / target) * 100)
}

/**
 * 완주 조건을 채웠는가 — **판정의 단일 출처**.
 * 서버 RPC(complete_shrine_vow)의 WHERE 절과 같은 식이라, 화면이 먼저 보여준 상태와 서버 판정이 갈리지 않는다.
 */
export function isVowComplete(vow: VowRecord, totalDays: number): boolean {
  return vowRemainingDays(vow, totalDays) === 0
}

/**
 * 백일초(百日燭)에 남은 초의 비율(1 → 0). 진행할수록 초가 짧아진다 — PRD §3 시각화.
 * 0.06 아래로는 내려가지 않는다: 완주 직전에 초가 사라지면 불꽃이 허공에 뜬다.
 */
export const CANDLE_MIN_RATIO = 0.06

export function candleRemainingRatio(percent: number): number {
  const p = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0
  return Math.max(CANDLE_MIN_RATIO, Math.round((1 - p / 100) * 1000) / 1000)
}

// ─── 휴면 판정 (KST 일 단위) ──────────────────────────────────

/** "YYYY-MM-DD" → UTC 자정 epochMs. 형식이 아니면 null. */
function dayKeyToMs(dayKey: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return null
  const ms = Date.parse(`${dayKey}T00:00:00Z`)
  return Number.isFinite(ms) ? ms : null
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * 두 KST 날짜키 사이의 일수(to − from). 어느 한쪽이라도 형식이 아니면 null.
 * `shrine_devotion.last_prayer_date` 가 KST date 라 문자열을 그대로 받는다 — 타임존을 두 번 옮기지 않는다.
 */
export function kstDayDiff(fromDayKey: string, toDayKey: string): number | null {
  const a = dayKeyToMs(fromDayKey)
  const b = dayKeyToMs(toDayKey)
  if (a === null || b === null) return null
  return Math.round((b - a) / DAY_MS)
}

/**
 * 마지막 기도 이후 지난 KST 일수. 오늘 기도했으면 0.
 * 기도 기록이 없으면(null·빈 문자열) null — "0일"로 뭉개면 서약만 하고 한 번도 기도하지 않은 사람이
 * 방금 기도한 사람과 같아 보인다.
 */
export function daysSinceLastPrayer(lastPrayerDayKey: string | null, nowMs: number): number | null {
  if (!lastPrayerDayKey) return null
  const today = kstDayKey(nowMs)
  if (!today) return null
  const diff = kstDayDiff(lastPrayerDayKey, today)
  return diff === null ? null : Math.max(0, diff)
}

/**
 * 휴면인가 — 마지막 기도가 30일 넘게 지났다.
 * 기도 기록이 없으면 **서약 시각**을 기준으로 잰다(서약만 해놓고 한 번도 오지 않은 경우).
 */
export function isVowDormant(vow: VowRecord, lastPrayerDayKey: string | null, nowMs: number): boolean {
  const sinceLastPrayer = daysSinceLastPrayer(lastPrayerDayKey, nowMs)
  if (sinceLastPrayer !== null) return sinceLastPrayer >= BAEKIL_DORMANT_DAYS
  const sinceVow = kstDayDiff(kstDayKey(vow.startedAtMs), kstDayKey(nowMs))
  return sinceVow !== null && sinceVow >= BAEKIL_DORMANT_DAYS
}

// ─── 국면 · 요약 ──────────────────────────────────────────────

export interface VowProgress {
  phase: VowPhase
  /** 진행 중이면 그 회차, 없으면 0 */
  round: number
  /** 쌓은 날수(0~target) */
  earnedDays: number
  targetDays: number
  remainingDays: number
  /** 0~100 */
  percent: number
  /** 백일초 남은 높이 비율(1 → CANDLE_MIN_RATIO) */
  candleRatio: number
  /** 완주 처리를 눌러도 되는가 */
  ready: boolean
  /** 마지막 기도 이후 KST 일수(기록 없으면 null) */
  idleDays: number | null
}

/** 활성 서약 없음일 때의 진행도 — 화면이 null 분기를 만들지 않도록 빈 값을 준다. */
export const EMPTY_VOW_PROGRESS: VowProgress = Object.freeze({
  phase: 'none',
  round: 0,
  earnedDays: 0,
  targetDays: BAEKIL_TARGET_DAYS,
  remainingDays: BAEKIL_TARGET_DAYS,
  percent: 0,
  candleRatio: 1,
  ready: false,
  idleDays: null,
})

/**
 * 서약 하나의 현재 상태를 한 번에 계산한다. 결정론 — 같은 인자면 항상 같은 값.
 * vow 가 null 이면 EMPTY_VOW_PROGRESS.
 */
export function vowProgress(
  vow: VowRecord | null,
  totalDays: number,
  lastPrayerDayKey: string | null,
  nowMs: number
): VowProgress {
  if (!vow) return EMPTY_VOW_PROGRESS

  const targetDays = toInt(vow.targetDays, 1)
  const earnedDays = vowEarnedDays(vow, totalDays)
  const remainingDays = targetDays - earnedDays
  const percent = Math.round((earnedDays / targetDays) * 100)
  const idleDays = daysSinceLastPrayer(lastPrayerDayKey, nowMs)

  let phase: VowPhase
  if (vow.completedAtMs !== null) phase = 'completed'
  else if (remainingDays === 0) phase = 'ready'
  else if (isVowDormant(vow, lastPrayerDayKey, nowMs)) phase = 'dormant'
  else phase = 'active'

  return {
    phase,
    round: toInt(vow.round, 0),
    earnedDays,
    targetDays,
    remainingDays,
    percent,
    candleRatio: candleRemainingRatio(percent),
    ready: phase === 'ready',
    idleDays,
  }
}

/**
 * 다음 서약의 회차 번호 — 지금까지 쓴 회차 중 가장 큰 값 + 1.
 *
 * 완주 수가 아니라 **최대 회차**로 센다. 활성 서약이 있는 동안에도 회차 번호는 이미 발급돼 있고,
 * 완주 수로 세면 그 회차와 번호가 겹친다(DB 의 (user_id, round) UNIQUE 위반).
 */
export function nextVowRound(maxRound: number): number {
  return toInt(maxRound, 0) + 1
}

// ─── 트로피 — 완주 1회 = 트로피 1개 ───────────────────────────
//
// ⚠️ 트로피는 **별도 테이블이 아니다.** 완주 처리된 서약 행 그 자체가 트로피다.
//    행 하나가 곧 트로피 하나라서 "두 번 눌러 트로피가 두 개" 가 구조적으로 불가능하다
//    (완주 UPDATE 는 completed_at IS NULL 을 조건으로 걸어 두 번째 호출이 0 행이다).
//    회차별 구분은 아래 등급(재질)과 회차 번호·완주일이 함께 만든다.

export type VowTrophyTier = 'wood' | 'brass' | 'gold'

export const VOW_TROPHY_TIERS: readonly VowTrophyTier[] = Object.freeze(['wood', 'brass', 'gold'] as const)

export interface VowTrophyInfo {
  /** 표시명(한국어) */
  readonly label: string
  /** 명패에 새기는 한자 한 자 */
  readonly seal: string
  /** 명패 본체 색(설빛온기 톤). 에셋 404 여도 이 색으로 형태가 남는다 */
  readonly hex: string
  /** 테두리·광택 강조색 */
  readonly accent: string
  /** 스프라이트 경로(scripts/shrine-assets/ritual-baekil.mjs 산출물) */
  readonly asset: string
}

export const VOW_TROPHY_INFO: Readonly<Record<VowTrophyTier, VowTrophyInfo>> = Object.freeze({
  wood: Object.freeze({
    label: '목패',
    seal: '始',
    hex: '#6B4A2B',
    accent: '#C9A84C',
    asset: '/shrine/ritual/trophy-wood.webp',
  }),
  brass: Object.freeze({
    label: '놋패',
    seal: '恒',
    hex: '#9C7B3A',
    accent: '#E8D5A0',
    asset: '/shrine/ritual/trophy-brass.webp',
  }),
  gold: Object.freeze({
    label: '금패',
    seal: '極',
    hex: '#C9A84C',
    accent: '#F3E3B0',
    asset: '/shrine/ritual/trophy-gold.webp',
  }),
})

/** 서버 입력 검증용 타입 가드. */
export function isVowTrophyTier(value: unknown): value is VowTrophyTier {
  return typeof value === 'string' && (VOW_TROPHY_TIERS as readonly string[]).includes(value)
}

/**
 * 회차 → 트로피 등급. 1~2회차 목패 · 3~5회차 놋패 · 6회차부터 금패.
 *
 * 구간을 이렇게 끊은 이유: 100일 × 2 = 200일이 첫 승급, × 5 = 500일이 정점이다.
 * 기원 최고 단(20단 = 누적 570일)과 대략 같은 자리에 금패가 오도록 맞췄다 — 두 트랙의
 * "끝"이 서로 다른 시점에 오면 어느 쪽도 목표로 읽히지 않는다.
 */
export const TROPHY_TIER_ROUNDS = Object.freeze({ brass: 3, gold: 6 })

export function trophyTierForRound(round: number): VowTrophyTier {
  const r = toInt(round, 1)
  if (r >= TROPHY_TIER_ROUNDS.gold) return 'gold'
  if (r >= TROPHY_TIER_ROUNDS.brass) return 'brass'
  return 'wood'
}

/** 트로피 한 줄 표기 — "3회차 · 놋패". 화면 자막·툴팁용. */
export function trophyLabel(round: number): string {
  const r = toInt(round, 1)
  return `${r}회차 · ${VOW_TROPHY_INFO[trophyTierForRound(r)].label}`
}

// ─── 축원 영상 상태 ───────────────────────────────────────────
//
// 이번 차수는 **자리만** 만든다(레코드·상태·조회). 실제 렌더 파이프라인은 다음 차수다.
// 완주 시 서버가 'queued' 로 적어 두고, 파이프라인이 붙으면 rendering → ready 로 진행한다.
// DB CHECK 제약(shrine_vows.video_status)과 **문자열이 같아야 한다**.

export type VowVideoStatus = 'none' | 'queued' | 'rendering' | 'ready' | 'failed'

export const VOW_VIDEO_STATUSES: readonly VowVideoStatus[] = Object.freeze([
  'none',
  'queued',
  'rendering',
  'ready',
  'failed',
] as const)

export function isVowVideoStatus(value: unknown): value is VowVideoStatus {
  return typeof value === 'string' && (VOW_VIDEO_STATUSES as readonly string[]).includes(value)
}

/** 상태별 안내 문구 — 없는 상태를 화면이 지어내지 않도록 도메인이 갖는다. */
export const VOW_VIDEO_LABEL: Readonly<Record<VowVideoStatus, string>> = Object.freeze({
  none: '축원 영상 없음',
  queued: '축원 영상을 준비하고 있습니다',
  rendering: '축원 영상을 짓는 중입니다',
  ready: '축원 영상이 도착했습니다',
  failed: '축원 영상을 짓지 못했습니다',
})

/** 영상을 열 수 있는 상태인가 — 화면이 링크를 그릴 조건. */
export function isVowVideoWatchable(status: VowVideoStatus, url: string | null): boolean {
  return status === 'ready' && typeof url === 'string' && url.trim().length > 0
}

// ─── 마일스톤 문구 (결정론) ───────────────────────────────────
//
// 규율: 의료·심리 효능 주장 금지 · 단정·지시 금지(오방기와 같은 기준).
// 신위는 **본 것을 말할 뿐** 시키지 않는다. 금지 어휘는 테스트가 강제한다.

/** 문구 구간 경계(쌓은 날수 하한). 구간마다 4변형. */
const MILESTONE_STEPS: readonly number[] = Object.freeze([0, 1, 10, 30, 60, 90, 100])

const MILESTONE_LINES: Readonly<Record<number, readonly string[]>> = Object.freeze({
  0: Object.freeze([
    '백 일의 약속이 놓였구나. 첫 걸음은 아직 남아 있구나.',
    '서약이 상 위에 올랐구나. 이제 하루가 시작되는 자리로구나.',
    '심지가 새로 섰구나. 불은 그대의 첫 기도에서 붙는구나.',
    '백일초가 놓였구나. 아직 한 마디도 줄지 않았구나.',
  ]),
  1: Object.freeze([
    '첫 마디가 탔구나. 백 일은 이렇게 하루씩 오는구나.',
    '초가 한 번 짧아졌구나. 시작이 이미 지나갔구나.',
    '기도 한 자락이 쌓였구나. 자리를 잡아가는 중이구나.',
    '불빛이 처음으로 낮아졌구나. 길이 열린 자리로구나.',
  ]),
  10: Object.freeze([
    '열흘이 쌓였구나. 손이 자리를 기억하기 시작했구나.',
    '초가 눈에 띄게 줄었구나. 발걸음에 결이 생겼구나.',
    '열흘째 향이 같은 자리에서 오르는구나.',
    '기도가 습관 쪽으로 기울었구나. 조급할 자리가 아니구나.',
  ]),
  30: Object.freeze([
    '한 달이 지났구나. 백 일의 세 겹 중 한 겹이로구나.',
    '초가 허리께까지 왔구나. 남은 길이 앞의 길과 비슷하구나.',
    '서른 날이 쌓였구나. 쉬어간 날도 그 안에 들어 있구나.',
    '향불이 오래 앉은 자리가 보이는구나.',
  ]),
  60: Object.freeze([
    '예순 날을 넘겼구나. 남은 길이 지나온 길보다 짧아졌구나.',
    '초가 아래쪽에 들어섰구나. 여기서부터는 내리막이구나.',
    '두 달이 넘게 쌓였구나. 오던 대로 오면 되는 자리구나.',
    '불꽃이 낮아졌구나. 끝이 보이기 시작하는구나.',
  ]),
  90: Object.freeze([
    '아흔 날이 되었구나. 초가 손가락 한 마디만 남았구나.',
    '끝이 눈에 들어오는 자리로구나. 서두를 것은 없구나.',
    '열흘이 남았구나. 여기까지 온 걸음이 스스로 마무리하겠구나.',
    '불빛이 낮고 곧구나. 마지막 마디를 지나는 중이구나.',
  ]),
  100: Object.freeze([
    '백 일이 다 찼구나. 초가 제 몫을 다했구나.',
    '백 날의 기도가 여기 모였구나. 이제 거두는 자리로구나.',
    '심지 끝까지 왔구나. 약속이 지켜졌구나.',
    '백일초가 다 탔구나. 그대의 이름이 상 위에 남았구나.',
  ]),
})

/** 시드 → 0 이상 max 미만의 정수. max<=0 이면 0. */
function pickIndex(seed: number, max: number): number {
  if (max <= 0) return 0
  return (Math.imul(seed >>> 0, 2654435761) >>> 0) % max
}

/** 쌓은 날수가 속한 구간의 하한. */
export function milestoneStep(earnedDays: number): number {
  const n = toInt(earnedDays)
  let step = MILESTONE_STEPS[0]
  for (const s of MILESTONE_STEPS) if (n >= s) step = s
  return step
}

/**
 * 진행 상황에 대한 신위의 한마디. 같은 (회차, 날수)면 항상 같은 문장.
 * 회차를 시드에 넣어 2회차의 같은 날에 다른 문장이 나오게 한다 — 반복 루프의 피로를 줄인다.
 */
export function milestoneLine(earnedDays: number, round: number): string {
  const step = milestoneStep(earnedDays)
  const pool = MILESTONE_LINES[step]
  return pool[pickIndex(hashSeed(`baekil|${toInt(round, 1)}|${toInt(earnedDays)}`), pool.length)]
}

/** 문구 풀 전체(테스트의 금지 어휘 린트 대상). */
export function allMilestoneLines(): readonly string[] {
  return MILESTONE_STEPS.flatMap((s) => [...MILESTONE_LINES[s]])
}

/** 변형 수 — 구간마다 이만큼 있어야 한다(테스트가 고정). */
export const BAEKIL_VARIANTS = 4

/**
 * 휴면 안부 한마디 — 30일 넘게 오지 않은 이에게. 재촉·질책이 아니라 안부다.
 * 결정론(비운 날수 기준)이라 같은 날 여러 번 들어와도 문장이 흔들리지 않는다.
 */
const DORMANT_LINES: readonly string[] = Object.freeze([
  '오래 비었구나. 그대의 자리는 그대로 있으니 아무 때나 오시게.',
  '초는 그 자리에 그대로 있구나. 쌓아둔 날도 줄지 않았구나.',
  '한동안 발길이 없었구나. 남은 길은 기다려 주는 길이로구나.',
  '문은 열어 두었구나. 오늘 오시면 오늘의 하루가 쌓이겠구나.',
])

export function dormantLine(idleDays: number): string {
  return DORMANT_LINES[pickIndex(hashSeed(`baekil-idle|${toInt(idleDays)}`), DORMANT_LINES.length)]
}

export function allDormantLines(): readonly string[] {
  return [...DORMANT_LINES]
}
