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
import { MasterpieceSection } from '@/components/analysis/dashboard/MasterpieceSection'
import { JourneyFull } from '@/components/analysis/journey-card'
import { WallpaperGrid } from '@/components/analysis/wallpaper-card'
import { SamhapIntroCard } from '@/components/studio/samhap-intro-card'
import { CoupangBannerView } from '@/components/ads/coupang-banner'
import { buildJourney, type JourneyStage } from '@/lib/domain/analysis/journey'
import type { JourneyStatusData } from '@/app/actions/analysis/reading-insights'
import type { WallpaperStatus } from '@/app/actions/analysis/wallpaper'
import type { PreviewSceneId } from '@/lib/domain/dev-preview/scenes'

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
  balance: 12,
}

// ── 표 ────────────────────────────────────────────────────────────────────────

const PREVIEW_SCENE_VIEWS: Record<PreviewSceneId, () => React.ReactNode> = {
  // 🔴 아이콘이 이번 작업의 핵심이라 런처는 «그림이 실제로 뜨는가»를 보는 장면이다.
  //    빈 네모가 찍히면 그건 촬영 실패가 아니라 자산 결함이다(파일명·경로를 먼저 볼 것).
  'hub-launcher': () => <HubLauncher />,
  'hub-banner': () => <MasterpieceSection />,

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
