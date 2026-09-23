'use client'

/**
 * 장면 렌더 표 — 「컴포넌트 + 목 데이터」 조합이 여기 산다.
 *
 * 표의 키는 `PreviewSceneId` 라, `lib/domain/dev-preview/scenes.ts` 에 장면 한 줄을 더하면
 * 이 파일이 «그 키가 없다» 고 컴파일 에러를 낸다 — 표 두 개가 조용히 어긋나지 않는다.
 *
 * 🔴 목 값은 **서버가 실제로 주는 모양**을 그대로 흉내 낸다. 여기서 임의로 예쁜 값을 지어내면
 * 미리보기가 현실과 갈라져 도구 자체가 거짓이 된다.
 */

import { HubLauncher } from '@/components/analysis/HubLauncher'
import { JourneyFull } from '@/components/analysis/journey-card'
import { WallpaperGrid } from '@/components/analysis/wallpaper-card'
import { SamhapIntroCard } from '@/components/studio/samhap-intro-card'
import { CoupangBannerView } from '@/components/ads/coupang-banner'
import { buildJourney, type JourneyStage } from '@/lib/domain/analysis/journey'
import type { JourneyStatusData } from '@/app/actions/analysis/reading-insights'
import type { WallpaperStatus } from '@/app/actions/analysis/wallpaper'
import type { PreviewSceneId } from '@/lib/domain/dev-preview/scenes'
import { Bell, Home } from 'lucide-react'
import { IconGunghap, IconPass } from '@/components/icons/traditional-icons'
import { PassQuickViewBody } from '@/components/payment/pass-quick-view'
import type { PassOverview } from '@/app/actions/payment/passes'
import { useCallback, useMemo, useState } from 'react'
import { DeityTurn } from '@/components/shrine/scene/DeityTurn'
import { DeityTalkCard } from '@/components/shrine/scene/RitualDock'
import { StageLayers } from '@/components/shrine/scene/StageLayers'
import { deityTurnFrames } from '@/lib/domain/shrine/deities'
import {
  deityHeadRoomY,
  deityPodiumTopY,
  deityStandGrandeur,
  deityStandShift,
  type StageSpec,
} from '@/lib/domain/shrine/stage'
import { GRAND_ALTAR_THEMES, THEME_STAGE_WIDTH, grandAltarStructures } from '@/lib/domain/shrine/theme-stage'
import { applyStageFixtureOffsets } from '@/lib/domain/shrine/fixture-offsets'

// ── 복주머니 목 ───────────────────────────────────────────────────────────────

/** 완료 노드를 눌렀을 때 뜨는 상세(점수·측정일)의 목 — 실제 analysis_history 요약과 같은 모양. */
const JOURNEY_RECORDS: JourneyStatusData['records'] = {
  SAJU: { score: 82, createdAt: '2026-08-03T02:11:00.000Z' },
  FACE: { score: 76, createdAt: '2026-08-09T05:40:00.000Z' },
  HAND: { score: 71, createdAt: '2026-08-14T11:02:00.000Z' },
  FENGSHUI: { score: 88, createdAt: '2026-08-18T08:25:00.000Z' },
  SAMHAP: { score: 84, createdAt: '2026-08-21T13:47:00.000Z' },
}

const ALL_STAGES = ['SAJU', 'FACE', 'HAND', 'FENGSHUI', 'SAMHAP']

/** 미리보기에서는 이동하지 않는다 — 라우터를 태우면 장면이 튄다. */
const noGo = (_stage: JourneyStage) => {}

function JourneyScene({
  categories,
  reward,
}: {
  categories: readonly string[]
  reward: { claimed: boolean; claimedName: string | null } | null
}) {
  return <JourneyFull journey={buildJourney(categories)} records={JOURNEY_RECORDS} reward={reward} onGo={noGo} />
}

// ── 허브 목 ──────────────────────────────────────────────────────────────────

/**
 * 런처·메인 배너는 **목 데이터가 필요 없다.** 둘 다 상수(`HUB_LAUNCHER`)와 정적 자산만 보고
 * 서므로 로그인·DB 없이 그대로 선다 — 그게 허브 상단 층의 계약이기도 하다(hub-home.ts 주석).
 *
 * 배너는 `useRouter()` 를 쓰지만 여기서는 **아무도 누르지 않는다**(촬영은 클릭하지 않는다).
 * dev-preview 는 실제 App Router 라우트라 라우터 컨텍스트가 이미 있어 목이 필요 없다.
 */

// ── 배경화면 목 ───────────────────────────────────────────────────────────────

/**
 * 기본 자격 — 사주도 완주도 없는 신규 사용자. 각 장면은 이 위에 필요한 것만 얹는다.
 * `monthly: null` 이면 화면이 번들 폴백(`public/wallpapers/monthly-202608.webp`)으로 선다.
 */
const WALLPAPER_BASE: WallpaperStatus = {
  element: 'water',
  hasSaju: false,
  journeyComplete: false,
  isMember: false,
  unlocks: [],
  adUsedToday: false,
  monthly: null,
  premiumUrls: {},
}

// ── 내 이용권 팝업 목 ─────────────────────────────────────────────────────────

/** getMyPassOverview() 가 주는 모양 그대로. 날짜는 구매 +90일 · 구독 시작일 앵커 한 달. */
const PASS_FREE: PassOverview = {
  passes: {
    unlimited: false,
    membership: null,
    holdings: [
      { id: 'p1', source: 'onboarding', remaining: 1, expiresAt: '2026-12-01T00:00:00.000Z' },
      // 쓰는 순서는 만료 가까운 순(ent_consume) — 가입 선물이 남아 있다면 5장 팩은 아직 손대지 않은 상태다.
      { id: 'p2', source: 'purchase', remaining: 5, expiresAt: '2026-12-18T00:00:00.000Z' },
    ],
  },
  tier: null,
  planName: '무료 회원',
  isSubscribed: false,
  firstMonthEligible: true,
}

const PASS_MEMBER: PassOverview = {
  passes: {
    unlimited: false,
    membership: { quota: 5, used: 3, remaining: 2, resetsAt: '2026-10-19T00:00:00.000Z', renews: true },
    holdings: [{ id: 'p3', source: 'purchase', remaining: 1, expiresAt: '2026-11-30T00:00:00.000Z' }],
  },
  tier: 'SINGLE',
  planName: '싱글 멤버십',
  isSubscribed: true,
  firstMonthEligible: false,
}

const PASS_EMPTY: PassOverview = {
  passes: { unlimited: false, membership: null, holdings: [] },
  tier: null,
  planName: '무료 회원',
  isSubscribed: false,
  firstMonthEligible: false,
}

/**
 * 상단 바의 오른쪽 아이콘 줄(태극 · 표 · 종 · 홈)과 팝업 본문을 한 장에 세운다.
 * 실제 바(MobileHeader)는 세우지 않는다 — 종이 뜨자마자 서버 액션을 부른다(미리보기에는 로그인·DB 가 없다).
 */
function PassPopupScene({ overview }: { overview: PassOverview }) {
  const slot = 'flex h-11 w-11 items-center justify-center'
  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-14 items-center justify-end border-b border-primary/10 bg-background/80 px-4">
        <span className={`${slot} text-ink-light/70`}>
          <IconGunghap className="h-5 w-5" />
        </span>
        <span className={`${slot} text-primary`}>
          <IconPass className="h-5 w-5" />
        </span>
        <span className={`${slot} text-ink-light/70`}>
          <Bell className="h-5 w-5" />
        </span>
        <span className={`${slot} text-ink-light/70`}>
          <Home className="h-5 w-5" />
        </span>
      </div>
      <div className="mx-4 rounded-lg border border-gold-500/25 bg-surface px-6 pb-6 pt-6">
        <p className="flex items-center gap-1.5 pb-3 font-serif text-lg font-semibold text-gold-500">
          <IconPass className="h-4 w-4 shrink-0" />내 이용권
        </p>
        <PassQuickViewBody overview={overview} onNavigate={() => {}} />
      </div>
    </div>
  )
}

// ── 신당 목 ─────────────────────────────────────────────────────────────────────

/** 회전 시트를 구운 17 신위 — 경로 규약(deityTurnFrames)만 쓰고 DB 는 보지 않는다 */
const SPIN_DEITIES = [
  'seongju',
  'samsin',
  'jowang',
  'teoju',
  'dongja',
  'seonnyeo',
  'daegam',
  'dokkaebi',
  'bari',
  'eopsin',
  'choiyoung',
  'gwanseong',
  'baekma',
  'chilseong',
  'yongwang',
  'sansin',
  'okhwang',
] as const

/**
 * 신당 — 방 한 칸에 신위만 세운다(제단·살림 없음). 실제 방과 같은 컴포넌트·같은 스탠드 기하라
 * 캔버스 몸과 정지 스프라이트의 이음매·도약·가라앉힘·금가루를 로그인 없이 본다.
 */
function DeitySpinScene() {
  const [code, setCode] = useState<(typeof SPIN_DEITIES)[number]>('seongju')
  const [spinning, setSpinning] = useState(false)
  const frames = useMemo(() => deityTurnFrames(code), [code])
  const stop = useCallback(() => setSpinning(false), [])
  const spin = useCallback(() => setSpinning(true), [])
  return (
    <div className="space-y-3">
      <div
        className="relative mx-auto h-[62vh] w-full max-w-[430px] overflow-hidden rounded-xl bg-cover bg-center"
        style={{ backgroundImage: 'url(/shrine/themes/banga/room.webp)' }}
      >
        <DeityTurn
          key={code}
          baseUrl={`/shrine/deities/${code}/base.webp`}
          frames={frames}
          name={code}
          spinning={spinning}
          onSpinEnd={stop}
          onTap={spin}
          interactive
          idleGlow
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SPIN_DEITIES.map((c) => (
          <button
            key={c}
            type="button"
            data-deity={c}
            onClick={() => {
              setSpinning(false)
              setCode(c)
            }}
            className={`rounded border px-2 py-1 text-[11px] ${
              c === code ? 'border-gold-500 text-gold-500' : 'border-gold-500/20 text-ink-light/60'
            }`}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── 표 ────────────────────────────────────────────────────────────────────────

/** 테마 무대 두 벌 — 라이브 시드(v4 틀)와 같은 모양. ⑦ 은 자산 URL 만 바뀐다 */
function themeStages(code: string): Record<'live' | 'p7', StageSpec> {
  const dir = `/shrine/stage/${code}`
  return {
    live: {
      wallpaperUrl: `${dir}/room-wall-mural-v3.webp`,
      flooringUrl: `${dir}/room-floor-mural-v3.webp`,
      structures: grandAltarStructures(code),
      light: null,
    },
    p7: {
      wallpaperUrl: `${dir}/room-wall-mural-p7-v3.webp`,
      flooringUrl: `${dir}/room-floor-mural-p7-v3.webp`,
      floorShadeUrl: `${dir}/room-floor-shade-p7-v3.webp`,
      structures: grandAltarStructures(code).map((s) => ({ ...s, assetUrl: `${dir}/grand-altar-p7.webp` })),
      light: null,
    },
  }
}
/** 카메라 — 세계(320%) 안에서 방 한 칸을 어디에 세우는가. 대청 한가운데가 입장 화면이다 */
const THEME_CAMS = { 왼쪽: 0, 가운데: (THEME_STAGE_WIDTH - 100) / 2, 오른쪽: THEME_STAGE_WIDTH - 100 } as const

/**
 * 신당 — 테마 방을 **실제 방과 같은 층 순서**로 세운다(벽·바닥 → 그늘 판 → 하단 암전 → 신위 → 틀),
 * 그 아래에 실제 방처럼 신위 대화 입구 줄을 붙인다. 로그인·DB 없이 현행 시드와 ⑦ 을 번갈아 보고,
 * 틀을 옮겨 그늘이 따라오는지 본다.
 */
function ThemePaintedScene() {
  const [code, setCode] = useState('banga')
  const [look, setLook] = useState<'live' | 'p7'>('p7')
  const [cam, setCam] = useState<keyof typeof THEME_CAMS>('가운데')
  const [dx, setDx] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const stage = useMemo(
    () => applyStageFixtureOffsets(themeStages(code)[look], { deityStage: { dx, dy: 0 } }),
    [code, look, dx]
  )
  const stand = useMemo(
    () => deityStandShift(deityPodiumTopY(code), deityHeadRoomY(code), 0, deityStandGrandeur(code)),
    [code]
  )
  const frames = useMemo(() => deityTurnFrames('seongju'), [])
  const stop = useCallback(() => setSpinning(false), [])
  const spin = useCallback(() => setSpinning(true), [])
  const pill = (on: boolean) =>
    `rounded border px-2 py-1 text-[11px] ${on ? 'border-gold-500 text-gold-500' : 'border-gold-500/20 text-ink-light/60'}`
  return (
    <div className="space-y-3">
      <div className="mx-auto w-full max-w-[520px]">
        <div
          data-theme-room
          className="relative w-full overflow-hidden rounded-[18px]"
          style={{ height: 'min(72vh, 620px)', backgroundColor: '#1a1308' }}
        >
          <div className="absolute inset-y-0" style={{ width: `${THEME_STAGE_WIDTH}%`, left: `${-THEME_CAMS[cam]}%` }}>
            <StageLayers stage={stage} themeCode={code} slot="ground" zoned eager />
            <div
              className="absolute inset-x-0 bottom-0 h-[38%]"
              style={{ background: 'linear-gradient(180deg,transparent,rgba(0,0,0,0.32))' }}
            />
            <DeityTurn
              baseUrl="/shrine/deities/seongju/base.webp"
              frames={frames}
              name="seongju"
              spinning={spinning}
              onSpinEnd={stop}
              onTap={spin}
              interactive
              idleGlow
              podiumTopY={stand.podiumTopY}
              headRoomY={stand.headRoomY}
              offsetXPct={dx}
            />
            <StageLayers stage={stage} themeCode={code} slot="structures" zoned widthScale={100 / THEME_STAGE_WIDTH} />
          </div>
        </div>
        <DeityTalkCard name="성주신" onEnter={noEnter} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {GRAND_ALTAR_THEMES.map((c) => (
          <button
            key={c}
            type="button"
            data-theme={c}
            onClick={() => {
              setSpinning(false)
              setCode(c)
            }}
            className={pill(c === code)}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" data-look="live" onClick={() => setLook('live')} className={pill(look === 'live')}>
          현행
        </button>
        <button type="button" data-look="p7" onClick={() => setLook('p7')} className={pill(look === 'p7')}>
          ⑦
        </button>
        {(Object.keys(THEME_CAMS) as (keyof typeof THEME_CAMS)[]).map((k) => (
          <button key={k} type="button" data-cam={k} onClick={() => setCam(k)} className={pill(cam === k)}>
            {k}
          </button>
        ))}
        {[-8, 0, 8].map((v) => (
          <button key={v} type="button" data-dx={v} onClick={() => setDx(v)} className={pill(dx === v)}>
            틀 {v > 0 ? `+${v}` : v}
          </button>
        ))}
      </div>
    </div>
  )
}

/** 미리보기에서는 계측하지 않는다 — 대화 입구 줄의 모양만 본다 */
const noEnter = () => {}

const PREVIEW_SCENE_VIEWS: Record<PreviewSceneId, () => React.ReactNode> = {
  // 🔴 아이콘이 이번 작업의 핵심이라 런처는 «그림이 실제로 뜨는가»를 보는 장면이다.
  //    빈 네모가 찍히면 그건 촬영 실패가 아니라 자산 결함이다(파일명·경로를 먼저 볼 것).
  'hub-launcher': () => <HubLauncher />,

  'journey-empty': () => <JourneyScene categories={[]} reward={null} />,
  'journey-progress': () => <JourneyScene categories={['SAJU', 'FACE']} reward={null} />,
  'journey-complete-unclaimed': () => (
    <JourneyScene categories={ALL_STAGES} reward={{ claimed: false, claimedName: null }} />
  ),
  'journey-claimed': () => <JourneyScene categories={ALL_STAGES} reward={{ claimed: true, claimedName: '칠성신' }} />,

  'wallpaper-free': () => <WallpaperGrid status={WALLPAPER_BASE} />,
  'wallpaper-member': () => <WallpaperGrid status={{ ...WALLPAPER_BASE, isMember: true }} />,
  'wallpaper-ad-used': () => <WallpaperGrid status={{ ...WALLPAPER_BASE, adUsedToday: true }} />,
  'wallpaper-purchased': () => (
    <WallpaperGrid
      status={{
        ...WALLPAPER_BASE,
        // 사주 자격은 일부러 없다 — 열린 장(출처 라벨)과 잠긴 장이 한 화면에 같이 보여야 대조가 된다
        adUsedToday: true,
        unlocks: [
          { wallpaperId: 'element-water', source: 'purchase' },
          { wallpaperId: 'element-fire', source: 'ad' },
        ],
      }}
    />
  ),

  'samhap-intro': () => <SamhapIntroCard />,
  // 목 URL — 실제 링크는 system_settings 가 준다(여기서는 조회하지 않는다).
  'coupang-banner': () => <CoupangBannerView url="https://link.coupang.com/a/EXAMPLE" />,

  'pass-popup-free': () => <PassPopupScene overview={PASS_FREE} />,
  'pass-popup-member': () => <PassPopupScene overview={PASS_MEMBER} />,
  'pass-popup-empty': () => <PassPopupScene overview={PASS_EMPTY} />,

  'shrine-deity-spin': () => <DeitySpinScene />,
  'shrine-theme-p7': () => <ThemePaintedScene />,
}

/**
 * 서버 라우트가 쓰는 유일한 입구 — 장면 id 를 받아 표에서 골라 세운다.
 *
 * 🔴 표(`PREVIEW_SCENE_VIEWS`)를 export 해서 서버 컴포넌트가 직접 색인하면 **안 된다**.
 * 'use client' 모듈의 export 는 RSC 경계를 넘을 때 이름별 «클라이언트 참조»로 바뀌므로,
 * 서버에서 객체를 받아 `[id]` 로 뒤지면 등록되지 않은 참조가 나와 화면이 통째로 죽는다
 * (실측: SSR 본문이 비고 하이드레이션도 안 붙어 촬영이 전부 타임아웃).
 * 고르는 일은 이렇게 클라이언트 쪽에서 끝낸다.
 */
export function PreviewSceneView({ sceneId }: { sceneId: PreviewSceneId }) {
  const View = PREVIEW_SCENE_VIEWS[sceneId]
  return <View />
}
