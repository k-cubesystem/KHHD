import { readFileSync } from 'node:fs'
import path from 'node:path'
import {
  BAEKIL_DISCLAIMER,
  BAEKIL_DORMANT_DAYS,
  BAEKIL_GA,
  BAEKIL_ITEM_NAME,
  BAEKIL_PRIVACY_NOTICE,
  BAEKIL_TARGET_DAYS,
  BAEKIL_VARIANTS,
  CANDLE_MIN_RATIO,
  EMPTY_VOW_PROGRESS,
  TROPHY_TIER_ROUNDS,
  VOW_TROPHY_INFO,
  VOW_TROPHY_TIERS,
  VOW_VIDEO_LABEL,
  VOW_VIDEO_STATUSES,
  allDormantLines,
  allMilestoneLines,
  candleRemainingRatio,
  daysSinceLastPrayer,
  dormantLine,
  isVowComplete,
  isVowDormant,
  isVowTrophyTier,
  isVowVideoStatus,
  isVowVideoWatchable,
  kstDayDiff,
  milestoneLine,
  milestoneStep,
  nextVowRound,
  trophyLabel,
  trophyTierForRound,
  vowEarnedDays,
  vowPercent,
  vowProgress,
  vowRemainingDays,
  type VowRecord,
  type VowTrophyTier,
  type VowVideoStatus,
} from '../baekil'

/** KST 시각을 UTC epoch 으로 — 테스트 의도를 KST 로 읽히게 한다(KST = UTC+9). */
function kst(y: number, m: number, d: number, h = 0, min = 0): number {
  return Date.UTC(y, m - 1, d, h - 9, min)
}

const read = (rel: string): string => readFileSync(path.join(process.cwd(), rel), 'utf8')
const MIGRATION_SQL = read('supabase/migrations/20260730_shrine_vows.sql')
const ACTIONS_SRC = read('app/actions/shrine/rituals.ts')
const GRANT_SRC = read('lib/services/ritual-grant.ts')

/** 표준 서약 한 건 — 필요한 값만 덮어쓴다. */
function vow(partial: Partial<VowRecord> = {}): VowRecord {
  return {
    round: 1,
    devotionSnapshot: 0,
    targetDays: BAEKIL_TARGET_DAYS,
    startedAtMs: kst(2026, 7, 30, 9),
    completedAtMs: null,
    ...partial,
  }
}

describe('정책 상수', () => {
  it('한 회차는 100일, 휴면 판정은 30일', () => {
    expect(BAEKIL_TARGET_DAYS).toBe(100)
    expect(BAEKIL_DORMANT_DAYS).toBe(30)
  })

  it('DB 기본값(target_days)이 도메인 상수와 같다', () => {
    expect(MIGRATION_SQL).toMatch(new RegExp(`target_days\\s+int not null default ${BAEKIL_TARGET_DAYS}`, 'i'))
  })

  it('GA4 이벤트명은 PRD §3 확정 그대로다', () => {
    expect(BAEKIL_GA.start).toBe('vow_start')
    expect(BAEKIL_GA.complete).toBe('vow_complete')
    expect(BAEKIL_GA.videoView).toBe('vow_video_view')
  })

  it('고지 문구가 효능을 주장하지 않고, 무저장을 먼저 말한다', () => {
    expect(BAEKIL_DISCLAIMER).toContain('대신하지 않습니다')
    // 2026-08-01 소원 기원을 백일기도로 합치면서 **적는 곳이 생겼다**(CEO 지시).
    // 그래서 약속의 내용이 "받지 않는다"에서 "내 신당에만 남고 남에게 가지 않는다"로 바뀌었다.
    // 여전히 지켜야 하는 것은 **어디에 남고 어디로 가지 않는지를 먼저 말하는 것**이다.
    expect(BAEKIL_PRIVACY_NOTICE).toContain('나의 신당 기록에만')
    expect(BAEKIL_PRIVACY_NOTICE).toContain('남에게 보내지 않습니다')
  })
})

describe('스키마 — 프라이버시·RLS 를 SQL 로 강제', () => {
  /**
   * 소원 원문을 담을 자리가 **없는지** — 액막이·오방기와 같은 기획 가치다.
   * 컬럼 집합을 통째로 고정한다: 텍스트 컬럼이 새로 생기면 즉시 실패한다.
   * (PRD §3 의 wish_text 는 실물 굿 O2O 보류로 수집 사유가 사라져 만들지 않았다)
   */
  it('shrine_vows 에 소원 원문 컬럼이 없다 (컬럼 집합 고정)', () => {
    const body = /create table if not exists public\.shrine_vows\s*\(([\s\S]*?)\n\);/i.exec(MIGRATION_SQL)?.[1]
    expect(body).toBeTruthy()
    const columns = (body ?? '')
      .split('\n')
      .map((l) => l.replace(/--.*$/, '').trim())
      .filter((l) => l.length > 0 && !/^(primary key|unique|constraint|check|foreign key)\b/i.test(l))
      .map((l) => l.split(/\s+/)[0])
      // check 제약이 여러 줄로 이어진 부분(들여쓴 continuation)은 컬럼이 아니다
      .filter((c) => /^[a-z_]+$/.test(c))
    expect(columns).toEqual([
      'id',
      'user_id',
      'round',
      'devotion_snapshot',
      'target_days',
      'started_at',
      'completed_at',
      'video_status',
      'video_url',
    ])
  })

  it('소원·고민 원문을 뜻하는 컬럼명이 하나도 없다', () => {
    for (const word of ['wish_text', 'wish', 'note', 'memo', 'message', 'content', 'body']) {
      expect(MIGRATION_SQL).not.toMatch(new RegExp(`^\\s*${word}\\s+text`, 'im'))
    }
  })

  it('RLS 가 켜져 있고 정책은 본인 SELECT 하나뿐이다', () => {
    expect(MIGRATION_SQL).toMatch(/alter table public\.shrine_vows enable row level security/i)
    expect(MIGRATION_SQL).toMatch(
      /create policy shrine_vows_select_own[\s\S]*?for select using \(auth\.uid\(\) = user_id\)/i
    )
    // 쓰기 정책을 주면 클라이언트가 completed_at 을 스스로 찍어 트로피·아이템을 무한 발행한다
    expect(MIGRATION_SQL).not.toMatch(/for\s+(insert|update|delete)/i)
  })

  it('활성 서약 1건 제약이 부분 UNIQUE 인덱스로 걸려 있다', () => {
    expect(MIGRATION_SQL).toMatch(
      /create unique index if not exists shrine_vows_one_active_idx[\s\S]*?\(user_id\) where completed_at is null/i
    )
  })

  it('회차 번호가 사용자당 유일하다', () => {
    expect(MIGRATION_SQL).toMatch(/unique \(user_id, round\)/i)
  })

  it.each([['start_shrine_vow'], ['complete_shrine_vow'], ['set_shrine_vow_video']])(
    '%s 은 security definer + service_role 전용이다',
    (fn) => {
      expect(MIGRATION_SQL).toMatch(new RegExp(`create or replace function public\\.${fn}`, 'i'))
      expect(MIGRATION_SQL).toMatch(
        new RegExp(`revoke all on function public\\.${fn}[\\s\\S]*?from public, anon, authenticated`, 'i')
      )
      expect(MIGRATION_SQL).toMatch(
        new RegExp(`grant execute on function public\\.${fn}[\\s\\S]*?to service_role`, 'i')
      )
    }
  )

  it('RPC 세 개 모두 search_path 를 고정한다', () => {
    expect(MIGRATION_SQL.match(/set search_path to 'public'/gi)).toHaveLength(3)
    expect(MIGRATION_SQL.match(/security definer/gi)).toHaveLength(3)
  })

  /**
   * 완주 판정과 지급이 **한 문장 안에서** 갈리지 않는지 — 두 번 눌러 트로피가 둘 생기는 사고를 막는 자리다.
   * UPDATE 의 `completed_at is null` 조건이 사라지면 재호출마다 새 트로피·새 아이템이 나온다.
   */
  it('완주 UPDATE 가 completed_at is null 을 조건으로 건다 (이중 지급 차단)', () => {
    const fn = /create or replace function public\.complete_shrine_vow[\s\S]*?\$\$;/i.exec(MIGRATION_SQL)?.[0] ?? ''
    expect(fn).not.toBe('')
    expect(fn).toMatch(/update public\.shrine_vows[\s\S]*?and v\.completed_at is null/i)
    // 진행도는 서버가 shrine_devotion 에서 재판정한다(클라 값 미신뢰)
    expect(fn).toMatch(/shrine_devotion[\s\S]*?- v\.devotion_snapshot >= v\.target_days/i)
    // 아이템 지급은 완주가 성립한 뒤에만
    const update = fn.indexOf('update public.shrine_vows')
    const grant = fn.indexOf('insert into public.user_shrine_inventory')
    const guard = fn.indexOf('if v_id is null then')
    expect(update).toBeLessThan(guard)
    expect(guard).toBeLessThan(grant)
  })

  it('서약 시작 스냅샷을 서버가 직접 읽는다 (클라 값 미신뢰)', () => {
    const fn = /create or replace function public\.start_shrine_vow[\s\S]*?\$\$;/i.exec(MIGRATION_SQL)?.[0] ?? ''
    expect(fn).toMatch(/select d\.total_days from public\.shrine_devotion d/i)
    // 스냅샷을 인자로 받으면 0 을 보내 그 자리에서 완주할 수 있다
    expect(fn).not.toMatch(/p_snapshot/i)
  })

  it('완주 보상 아이템 시드가 걸이(hanging) 층이고 무료가 아니다', () => {
    const seed = /insert into public\.shrine_item_catalog[\s\S]*?;\n/i.exec(MIGRATION_SQL)?.[0] ?? ''
    expect(seed).toContain(BAEKIL_ITEM_NAME)
    expect(seed).toContain("'hanging'")
    // 가격 0 + is_active=true 면 상점에서 무료로 집어갈 수 있다(purchaseToInventory)
    expect(seed).toMatch(/'talisman', 'legendary', 0, 0, [1-9]\d*/)
    // 재실행 시 태그 소실 이력 → UPDATE 로 덮지 않고 없을 때만 INSERT
    expect(seed).toMatch(/where not exists/i)
  })
})

describe('지급 경로 — 공개 액션은 인자를 받지 않는다', () => {
  it('지급 모듈이 server-only 다', () => {
    expect(GRANT_SRC).toMatch(/^import 'server-only'/m)
  })

  it('서버 액션이 인벤토리를 직접 만지지 않는다', () => {
    expect(ACTIONS_SRC).not.toMatch(/from\(\s*['"]user_shrine_inventory['"]/)
    expect(ACTIONS_SRC).not.toMatch(/rpc\(\s*['"]grant_shrine_item/)
  })

  it('완주 지급은 lib/services/ritual-grant 경유다', () => {
    expect(ACTIONS_SRC).toMatch(/import \{ grantVowCompletion \} from '@\/lib\/services\/ritual-grant'/)
  })

  /**
   * 서약·완주 액션은 **인자가 없어야 한다**. 회차·수량·아이템명을 인자로 열면
   * 'use server' export 가 곧 공개 엔드포인트라 유저가 원하는 값을 넣어 부를 수 있다.
   */
  it('startBaekilVow · settleBaekilVow 가 인자를 받지 않는다', () => {
    expect(ACTIONS_SRC).toMatch(/export async function startBaekilVow\(\): Promise<StartBaekilResult>/)
    expect(ACTIONS_SRC).toMatch(/export async function settleBaekilVow\(\): Promise<SettleBaekilResult>/)
  })

  it('현황 조회가 아무것도 바꾸지 않는다 (조회가 지급을 일으키지 않는다)', () => {
    const fn = /export async function getBaekilStatus\(\)[\s\S]*?\n\}/.exec(ACTIONS_SRC)?.[0] ?? ''
    expect(fn).not.toBe('')
    expect(fn).not.toMatch(/grantVowCompletion|complete_shrine_vow|start_shrine_vow/)
  })
})

describe('진행도 — 기원 누적일에서 파생', () => {
  it('쌓은 날수 = 현재 누적 − 스냅샷', () => {
    expect(vowEarnedDays(vow({ devotionSnapshot: 12 }), 42)).toBe(30)
    expect(vowRemainingDays(vow({ devotionSnapshot: 12 }), 42)).toBe(70)
    expect(vowPercent(vow({ devotionSnapshot: 12 }), 42)).toBe(30)
  })

  it('목표를 넘겨도 100일에서 멈춘다 (넘친 날수는 이월하지 않는다)', () => {
    expect(vowEarnedDays(vow(), 137)).toBe(100)
    expect(vowRemainingDays(vow(), 137)).toBe(0)
    expect(vowPercent(vow(), 137)).toBe(100)
  })

  it('스냅샷이 현재 누적보다 커도 음수가 되지 않는다 (게이지가 뒤집히지 않는다)', () => {
    expect(vowEarnedDays(vow({ devotionSnapshot: 80 }), 40)).toBe(0)
    expect(vowPercent(vow({ devotionSnapshot: 80 }), 40)).toBe(0)
  })

  it('비유한수·소수를 흘려도 정수로 접힌다', () => {
    expect(vowEarnedDays(vow(), Number.NaN)).toBe(0)
    expect(vowEarnedDays(vow(), 30.9)).toBe(30)
    expect(vowEarnedDays(vow({ targetDays: Number.NaN }), 50)).toBe(1)
  })

  it('isVowComplete — 딱 100일부터 완주', () => {
    expect(isVowComplete(vow(), 99)).toBe(false)
    expect(isVowComplete(vow(), 100)).toBe(true)
    expect(isVowComplete(vow(), 101)).toBe(true)
  })

  it('스냅샷이 있는 2회차도 자기 100일만 센다', () => {
    const second = vow({ round: 2, devotionSnapshot: 100 })
    expect(isVowComplete(second, 100)).toBe(false)
    expect(isVowComplete(second, 199)).toBe(false)
    expect(isVowComplete(second, 200)).toBe(true)
  })
})

describe('백일초 — 진행할수록 짧아진다', () => {
  it('0% 면 가득, 100% 면 최소치까지만 줄어든다', () => {
    expect(candleRemainingRatio(0)).toBe(1)
    expect(candleRemainingRatio(100)).toBe(CANDLE_MIN_RATIO)
  })

  it('진행률이 오르면 초는 단조 감소한다', () => {
    let prev = candleRemainingRatio(0)
    for (let p = 1; p <= 100; p += 1) {
      const cur = candleRemainingRatio(p)
      expect(cur).toBeLessThanOrEqual(prev)
      prev = cur
    }
  })

  it('완주 직전에 초가 사라지지 않는다 (불꽃이 허공에 뜨지 않게)', () => {
    for (let p = 0; p <= 100; p += 1) expect(candleRemainingRatio(p)).toBeGreaterThanOrEqual(CANDLE_MIN_RATIO)
  })

  it('범위 밖·비유한수를 넣어도 무너지지 않는다', () => {
    expect(candleRemainingRatio(-30)).toBe(1)
    expect(candleRemainingRatio(999)).toBe(CANDLE_MIN_RATIO)
    expect(candleRemainingRatio(Number.NaN)).toBe(1)
  })
})

describe('KST 일수 · 휴면 판정', () => {
  it('kstDayDiff — 날짜키 사이의 일수', () => {
    expect(kstDayDiff('2026-07-30', '2026-07-30')).toBe(0)
    expect(kstDayDiff('2026-07-30', '2026-07-31')).toBe(1)
    expect(kstDayDiff('2026-06-30', '2026-07-30')).toBe(30)
    expect(kstDayDiff('2026-07-31', '2026-07-30')).toBe(-1)
  })

  it('kstDayDiff — 형식이 아니면 null (0으로 뭉개지 않는다)', () => {
    expect(kstDayDiff('', '2026-07-30')).toBeNull()
    expect(kstDayDiff('2026/07/30', '2026-07-30')).toBeNull()
    expect(kstDayDiff('2026-07-30', 'today')).toBeNull()
  })

  it('daysSinceLastPrayer — 오늘 기도했으면 0, 기록이 없으면 null', () => {
    const now = kst(2026, 7, 30, 12)
    expect(daysSinceLastPrayer('2026-07-30', now)).toBe(0)
    expect(daysSinceLastPrayer('2026-07-29', now)).toBe(1)
    expect(daysSinceLastPrayer('2026-06-30', now)).toBe(30)
    expect(daysSinceLastPrayer(null, now)).toBeNull()
    expect(daysSinceLastPrayer('', now)).toBeNull()
  })

  it('KST 자정을 넘기면 하루가 는다', () => {
    expect(daysSinceLastPrayer('2026-07-30', kst(2026, 7, 30, 23, 59))).toBe(0)
    expect(daysSinceLastPrayer('2026-07-30', kst(2026, 7, 31, 0, 0))).toBe(1)
  })

  it('isVowDormant — 마지막 기도 30일째부터 휴면', () => {
    const now = kst(2026, 7, 30, 12)
    expect(isVowDormant(vow(), '2026-07-29', now)).toBe(false)
    expect(isVowDormant(vow(), '2026-07-01', now)).toBe(false) // 29일
    expect(isVowDormant(vow(), '2026-06-30', now)).toBe(true) // 30일
  })

  it('기도 기록이 없으면 서약 시각을 기준으로 잰다 (서약만 하고 오지 않은 경우)', () => {
    const started = vow({ startedAtMs: kst(2026, 6, 1, 9) })
    expect(isVowDormant(started, null, kst(2026, 6, 20, 9))).toBe(false)
    expect(isVowDormant(started, null, kst(2026, 7, 1, 9))).toBe(true)
  })
})

describe('vowProgress — 국면 판정', () => {
  const now = kst(2026, 7, 30, 12)

  it('서약이 없으면 빈 값(phase=none)', () => {
    expect(vowProgress(null, 300, '2026-07-30', now)).toEqual(EMPTY_VOW_PROGRESS)
    expect(EMPTY_VOW_PROGRESS.targetDays).toBe(BAEKIL_TARGET_DAYS)
  })

  it('진행 중이면 active', () => {
    const p = vowProgress(vow(), 40, '2026-07-30', now)
    expect(p.phase).toBe('active')
    expect(p.earnedDays).toBe(40)
    expect(p.remainingDays).toBe(60)
    expect(p.percent).toBe(40)
    expect(p.ready).toBe(false)
    expect(p.idleDays).toBe(0)
  })

  it('100일이 차면 ready', () => {
    const p = vowProgress(vow(), 100, '2026-07-30', now)
    expect(p.phase).toBe('ready')
    expect(p.ready).toBe(true)
    expect(p.remainingDays).toBe(0)
  })

  it('30일 넘게 안 오면 dormant — 쌓은 날은 그대로다 (실패 개념 없음)', () => {
    const p = vowProgress(vow(), 40, '2026-06-30', now)
    expect(p.phase).toBe('dormant')
    expect(p.earnedDays).toBe(40)
    expect(p.idleDays).toBe(30)
  })

  it('휴면이어도 100일이 찼으면 ready 가 이긴다 (완주를 막지 않는다)', () => {
    expect(vowProgress(vow(), 100, '2026-06-30', now).phase).toBe('ready')
  })

  it('완주 처리된 서약은 completed', () => {
    const done = vow({ completedAtMs: kst(2026, 7, 29, 20) })
    expect(vowProgress(done, 100, '2026-07-30', now).phase).toBe('completed')
  })

  /** 며칠 쉬어도 진행도가 깎이지 않는다 — 스트릭이 아니라 누적이라는 기획의 핵심. */
  it('끊겨도 쌓인 날이 줄지 않는다', () => {
    const v = vow({ devotionSnapshot: 10 })
    const kept = vowProgress(v, 55, '2026-07-30', now).earnedDays
    const paused = vowProgress(v, 55, '2026-05-30', now).earnedDays
    expect(paused).toBe(kept)
  })
})

describe('회차 — 재서약 규칙', () => {
  it('다음 회차는 최대 회차 + 1 (완주 수가 아니다)', () => {
    expect(nextVowRound(0)).toBe(1)
    expect(nextVowRound(1)).toBe(2)
    expect(nextVowRound(7)).toBe(8)
  })

  /**
   * 활성 서약이 회차 번호를 이미 쓰고 있으므로 **완주 수로 세면 번호가 겹친다**
   * (DB 의 (user_id, round) UNIQUE 위반). 1회차 진행 중 = 완주 0건이지만 다음 번호는 2다.
   */
  it('진행 중인 회차가 있으면 그 번호를 건너뛴다', () => {
    const completedCount = 0
    const maxRound = 1 // 1회차 진행 중
    expect(nextVowRound(maxRound)).toBe(2)
    expect(nextVowRound(maxRound)).not.toBe(nextVowRound(completedCount))
  })

  it('비정상 값은 1회차로 접힌다', () => {
    expect(nextVowRound(Number.NaN)).toBe(1)
    expect(nextVowRound(-5)).toBe(1)
  })

  /**
   * 스냅샷은 **서약을 누른 순간의 누적일**이다 — 이월하지 않는다.
   * 이월하면 오래 기도해 온 사람이 재서약 즉시 여러 회차를 한꺼번에 완주해 트로피가 쏟아진다.
   */
  it('재서약 스냅샷이 지금 값이면 다음 회차는 0일에서 시작한다', () => {
    const totalDays = 137 // 1회차(0→100) 완주 후 37일 더 기도했다
    const second = vow({ round: 2, devotionSnapshot: totalDays })
    expect(vowEarnedDays(second, totalDays)).toBe(0)
    expect(isVowComplete(second, totalDays)).toBe(false)
    expect(isVowComplete(second, totalDays + 100)).toBe(true)
  })

  /** 도메인에 '포기' 상태를 두지 않는다 — 손해만 남는 되돌릴 수 없는 버튼이라 만들지 않았다. */
  it('포기·파기 상태가 존재하지 않는다', () => {
    const phases = ['none', 'active', 'dormant', 'ready', 'completed']
    const now = kst(2026, 7, 30, 12)
    for (const total of [0, 1, 50, 99, 100, 500]) {
      for (const last of [null, '2026-07-30', '2026-01-01']) {
        expect(phases).toContain(vowProgress(vow(), total, last, now).phase)
      }
    }
    // VowPhase 유니온 자체에 포기·만료 상태가 없다(축원 영상의 'failed' 와 혼동하지 않게 유니온만 본다)
    // 줄바꿈 표기(LF/CRLF)에 걸리지 않게 — 파일이 어느 쪽으로 저장돼도 같은 것을 봐야 한다
    const union = /export type VowPhase =([\s\S]*?)\r?\n\r?\n/.exec(read('lib/domain/ritual/baekil.ts'))?.[1] ?? ''
    expect(union).not.toBe('')
    for (const bad of ['abandoned', 'gaveup', 'expired', 'failed', 'broken']) {
      expect(union).not.toContain(`'${bad}'`)
    }
  })
})

describe('트로피 — 완주 1회 = 트로피 1개', () => {
  it('등급 3종 — 목패·놋패·금패', () => {
    expect([...VOW_TROPHY_TIERS]).toEqual(['wood', 'brass', 'gold'])
    expect(VOW_TROPHY_TIERS.map((t) => VOW_TROPHY_INFO[t].label)).toEqual(['목패', '놋패', '금패'])
  })

  it('표시명·인장·색·에셋이 모든 등급에 빠짐없이 있다', () => {
    for (const t of VOW_TROPHY_TIERS) {
      const info = VOW_TROPHY_INFO[t]
      expect(info.label).toBeTruthy()
      expect(info.seal).toHaveLength(1)
      expect(info.hex).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(info.accent).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(info.asset).toMatch(/^\/shrine\/ritual\/trophy-[a-z]+\.webp$/)
    }
  })

  it('등급별 에셋 경로가 서로 다르다', () => {
    const assets = VOW_TROPHY_TIERS.map((t) => VOW_TROPHY_INFO[t].asset)
    expect(new Set(assets).size).toBe(assets.length)
  })

  it('1~2회차 목패 · 3~5회차 놋패 · 6회차부터 금패', () => {
    expect(trophyTierForRound(1)).toBe('wood')
    expect(trophyTierForRound(2)).toBe('wood')
    expect(trophyTierForRound(3)).toBe('brass')
    expect(trophyTierForRound(5)).toBe('brass')
    expect(trophyTierForRound(6)).toBe('gold')
    expect(trophyTierForRound(99)).toBe('gold')
  })

  it('구간 경계가 상수와 일치한다', () => {
    expect(trophyTierForRound(TROPHY_TIER_ROUNDS.brass - 1)).toBe('wood')
    expect(trophyTierForRound(TROPHY_TIER_ROUNDS.brass)).toBe('brass')
    expect(trophyTierForRound(TROPHY_TIER_ROUNDS.gold - 1)).toBe('brass')
    expect(trophyTierForRound(TROPHY_TIER_ROUNDS.gold)).toBe('gold')
  })

  it('등급은 회차가 올라가며 되돌아가지 않는다', () => {
    const order: Record<VowTrophyTier, number> = { wood: 0, brass: 1, gold: 2 }
    let prev = 0
    for (let r = 1; r <= 30; r += 1) {
      const cur = order[trophyTierForRound(r)]
      expect(cur).toBeGreaterThanOrEqual(prev)
      prev = cur
    }
  })

  it('비정상 회차는 1회차로 접힌다', () => {
    expect(trophyTierForRound(0)).toBe('wood')
    expect(trophyTierForRound(-3)).toBe('wood')
    expect(trophyTierForRound(Number.NaN)).toBe('wood')
  })

  it('trophyLabel — 회차와 등급을 함께 읽힌다', () => {
    expect(trophyLabel(1)).toBe('1회차 · 목패')
    expect(trophyLabel(4)).toBe('4회차 · 놋패')
    expect(trophyLabel(9)).toBe('9회차 · 금패')
  })

  it('isVowTrophyTier 는 3종만 통과시킨다', () => {
    for (const t of VOW_TROPHY_TIERS) expect(isVowTrophyTier(t)).toBe(true)
    for (const bad of ['', 'WOOD', '목패', 'silver', null, undefined, 1, {}, ['gold']]) {
      expect(isVowTrophyTier(bad)).toBe(false)
    }
  })
})

describe('완주 보상 아이템', () => {
  it('아이템 이름이 마이그레이션 시드와 같다 (지급 RPC 의 유일한 키)', () => {
    expect(BAEKIL_ITEM_NAME).toBe('백일 소원끈')
    expect(MIGRATION_SQL).toContain(`'${BAEKIL_ITEM_NAME}'`)
  })

  it('지급 모듈이 그 이름으로만 지급한다', () => {
    expect(GRANT_SRC).toMatch(/p_item_name: BAEKIL_ITEM_NAME/)
  })
})

describe('축원 영상 — 이번 차수는 자리만', () => {
  it('상태 5종', () => {
    expect([...VOW_VIDEO_STATUSES]).toEqual(['none', 'queued', 'rendering', 'ready', 'failed'])
  })

  it('DB CHECK 제약과 상태 문자열이 같다', () => {
    for (const s of VOW_VIDEO_STATUSES) expect(MIGRATION_SQL).toContain(`'${s}'`)
  })

  it('완주하면 영상 자리가 queued 로 열린다', () => {
    const fn = /create or replace function public\.complete_shrine_vow[\s\S]*?\$\$;/i.exec(MIGRATION_SQL)?.[0] ?? ''
    expect(fn).toMatch(/video_status\s*=\s*'queued'/i)
  })

  it('isVowVideoStatus 는 5종만 통과시킨다', () => {
    for (const s of VOW_VIDEO_STATUSES) expect(isVowVideoStatus(s)).toBe(true)
    for (const bad of ['', 'READY', '완료', 'done', null, undefined, 0, {}, ['ready']]) {
      expect(isVowVideoStatus(bad)).toBe(false)
    }
  })

  it('상태마다 안내 문구가 있다', () => {
    for (const s of VOW_VIDEO_STATUSES) expect(VOW_VIDEO_LABEL[s as VowVideoStatus]).toBeTruthy()
  })

  it('ready + 주소가 있을 때만 열 수 있다', () => {
    expect(isVowVideoWatchable('ready', 'https://example.com/v.mp4')).toBe(true)
    expect(isVowVideoWatchable('ready', null)).toBe(false)
    expect(isVowVideoWatchable('ready', '   ')).toBe(false)
    expect(isVowVideoWatchable('queued', 'https://example.com/v.mp4')).toBe(false)
    expect(isVowVideoWatchable('none', null)).toBe(false)
  })

  it('영상 주소는 서버만 심을 수 있다 (서명 URL 게이트 보존)', () => {
    expect(MIGRATION_SQL).toMatch(
      /revoke all on function public\.set_shrine_vow_video[\s\S]*?from public, anon, authenticated/i
    )
    expect(ACTIONS_SRC).not.toMatch(/set_shrine_vow_video/)
  })
})

describe('문구 풀 — 결정론 + 법무', () => {
  it('구간 7개 × 변형 4 = 28문', () => {
    expect(BAEKIL_VARIANTS).toBe(4)
    expect(allMilestoneLines()).toHaveLength(7 * BAEKIL_VARIANTS)
  })

  it('28문이 전부 서로 다른 문장이다', () => {
    const lines = allMilestoneLines()
    expect(new Set(lines).size).toBe(lines.length)
  })

  it('milestoneStep — 날수가 속한 구간의 하한', () => {
    expect(milestoneStep(0)).toBe(0)
    expect(milestoneStep(1)).toBe(1)
    expect(milestoneStep(9)).toBe(1)
    expect(milestoneStep(10)).toBe(10)
    expect(milestoneStep(29)).toBe(10)
    expect(milestoneStep(30)).toBe(30)
    expect(milestoneStep(59)).toBe(30)
    expect(milestoneStep(60)).toBe(60)
    expect(milestoneStep(89)).toBe(60)
    expect(milestoneStep(90)).toBe(90)
    expect(milestoneStep(99)).toBe(90)
    expect(milestoneStep(100)).toBe(100)
  })

  it('같은 (회차, 날수)면 항상 같은 문장', () => {
    for (let d = 0; d <= 100; d += 7) expect(milestoneLine(d, 1)).toBe(milestoneLine(d, 1))
  })

  it('회차가 다르면 문장이 갈릴 수 있다 (반복 루프의 피로를 줄인다)', () => {
    const seen = new Set<string>()
    for (let r = 1; r <= 12; r += 1) seen.add(milestoneLine(50, r))
    expect(seen.size).toBeGreaterThan(1)
  })

  it('모든 날수가 풀 안의 문장을 낸다', () => {
    const pool = new Set(allMilestoneLines())
    for (let d = 0; d <= 120; d += 1) {
      for (let r = 1; r <= 4; r += 1) expect(pool.has(milestoneLine(d, r))).toBe(true)
    }
  })

  it('휴면 안부 문구도 결정론이고 풀 안에 있다', () => {
    const pool = new Set(allDormantLines())
    expect(allDormantLines()).toHaveLength(4)
    for (let d = 30; d <= 400; d += 13) {
      expect(dormantLine(d)).toBe(dormantLine(d))
      expect(pool.has(dormantLine(d))).toBe(true)
    }
  })

  // 표시광고법(L-트랙) — 효능 주장·단정·지시 금지. 오방기 린트와 같은 기준이다.
  // 백일기도는 "백일 기도하면 이루어진다" 로 읽히기 쉬워 **성취·보장 어휘**를 특히 막는다.
  const FORBIDDEN = [
    '치유',
    '효과',
    '효능',
    '치료',
    '완치',
    '낫는',
    '보장',
    '반드시',
    '무조건',
    '확실',
    '틀림없',
    '절대',
    '100%',
    '이루어진',
    '이루어집니다',
    '성취',
    '기적',
    '액운이 사라',
    '운이 트',
    '재물',
    '투자',
    '대박',
    '해야 합니다',
    '하십시오',
  ]

  it.each(FORBIDDEN)('마일스톤 문구에 금지 어휘 "%s" 가 없다', (word) => {
    for (const line of allMilestoneLines()) expect(line).not.toContain(word)
  })

  it.each(FORBIDDEN)('휴면 안부 문구에 금지 어휘 "%s" 가 없다', (word) => {
    for (const line of allDormantLines()) expect(line).not.toContain(word)
  })

  it('모든 문구가 서술 어미(-구나/-이다)로 끝난다 — 지시가 아니라 관찰이다', () => {
    for (const line of allMilestoneLines()) expect(line).toMatch(/(구나|이다)\.$/)
  })

  it('휴면 안부는 재촉하지 않는다 (명령형 어미 없음)', () => {
    for (const line of allDormantLines()) {
      expect(line).not.toMatch(/(하십시오|해라|하라\.|서두르)/)
    }
  })
})

describe('타입 계약', () => {
  it('VowTrophyTier 유니온과 VOW_TROPHY_TIERS 가 어긋나면 컴파일이 깨진다', () => {
    const all: Record<VowTrophyTier, true> = { wood: true, brass: true, gold: true }
    expect(Object.keys(all).sort()).toEqual([...VOW_TROPHY_TIERS].sort())
  })

  it('VowVideoStatus 유니온과 VOW_VIDEO_STATUSES 가 어긋나면 컴파일이 깨진다', () => {
    const all: Record<VowVideoStatus, true> = {
      none: true,
      queued: true,
      rendering: true,
      ready: true,
      failed: true,
    }
    expect(Object.keys(all).sort()).toEqual([...VOW_VIDEO_STATUSES].sort())
  })
})
