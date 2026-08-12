import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft, Palette, Flame, Sparkles, PawPrint } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getSceneData } from '@/app/actions/shrine/scene'
import { listDeities, getDeityBonds, listThemePacks } from '@/app/actions/shrine/deities'
import { getShopData } from '@/app/actions/shrine/inventory'
import { getDevotionStatus } from '@/app/actions/shrine/devotion'
import { DeityPantheon } from '@/components/shrine/deities/DeityPantheon'
import { ThemeShopGrid } from '@/components/store/ThemeShopGrid'
import { ShrineShopClient } from '@/components/shrine/ShrineShopClient'
import { GuardianGrid } from '@/components/shrine/GuardianGrid'
import { listOwnedGuardianNames } from '@/app/actions/shrine/guardians'
import { DevotionStrip } from '@/components/shrine/scene/DevotionStrip'
// 기원 보상 시트(.devotion-sheet)의 연출 CSS. 신당 씬 CSS 는 룸이 싣지만 이 화면은 룸을 거치지 않는다 —
// 여기서 싣지 않으면 시트가 애니메이션 없이 툭 나타난다(styled-jsx 금지 규율은 그대로: 정적 파일만).
import '@/app/shrine-scene.css'

/**
 * 신당 모아보기 — 신당테마 · 아이템 · 신위를 탭 하나로 (CEO 6차 지시 2026-07-30).
 *
 * "신당테마, 아이템, 신위 한개버튼으로 묶어주고 페이지이동해서 3가지종류 탭으로 볼수있게해줘"
 *
 * ── 화면을 새로 그리지 않았다
 * 셋 다 **이미 있는 화면을 탭 안으로 들여왔다**. 새로 만들면 같은 목록이 두 벌이 되고,
 * 구매·좌정·적용 같은 손 대는 동작이 갈라져 한쪽만 고치는 사고가 난다.
 *   · 신위  → DeityPantheon      (구 /protected/shrine/deities. 그 라우트는 여기로 리다이렉트한다)
 *   · 테마  → ThemeShopGrid      (통합 상점 테마 탭과 같은 그리드. 여기서는 **적용**까지 한다)
 *   · 아이템 → ShrineShopClient   (통합 상점 신물 탭과 같은 그리드)
 * 통합 상점(/protected/store)의 두 탭은 그대로 둔다 — 상점은 복채·멤버십과 함께 파는 곳이고,
 * 여기는 "내 신당의 것을 모아 보는 곳"이라 목적이 다르다. 컴포넌트가 한 벌이라 화면은 갈리지 않는다.
 *
 * ── 테마 적용 손잡이가 여기로 왔다
 * 방 아래 테마 칩 줄이 걷히면서(지시 ②) 테마를 **입히는** 유일한 손잡이가 사라졌다.
 * 그래서 이 화면의 테마 탭에만 `apply` 를 준다(상점은 종전대로 파는 것까지만).
 *
 * ── 기원 보상 트랙도 여기로 왔다
 * 「기원 N단」 스트립이 방에서 걷히면서(지시 ④) 무료 보상 수령 버튼도 함께 사라졌다.
 * 그 보상이 곧 이 화면의 테마·신물이라(두 탭 모두 "🕯 기원 N단 무료" 라고 적고 있다)
 * 수령 손잡이가 갈 자리는 여기다. 없으면 쌓아 둔 보상을 받을 길이 통째로 막힌다.
 *
 * 로그인·멤버십 게이트는 app/protected/shrine/layout.tsx 가 신당 계열 전체에 한 번에 건다 —
 * 여기서 다시 검사하지 않는다(오방기·백일기도 페이지와 같은 규약).
 */

const TAB_KEYS = ['theme', 'item', 'deity', 'guardian'] as const
type TabKey = (typeof TAB_KEYS)[number]

const TABS: Array<{ key: TabKey; label: string; icon: typeof Palette }> = [
  { key: 'theme', label: '신당테마', icon: Palette },
  { key: 'item', label: '아이템', icon: Flame },
  { key: 'deity', label: '신위', icon: Sparkles },
  { key: 'guardian', label: '신수', icon: PawPrint },
]

function isTabKey(v: string | undefined): v is TabKey {
  return TAB_KEYS.includes(v as TabKey)
}

export const dynamic = 'force-dynamic'

export default async function ShrineCollectionPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; member?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { tab: rawTab, member } = await searchParams
  const tab: TabKey = isTabKey(rawTab) ? rawTab : 'theme'

  // 본인 소유 가족만 유효 — 아니면 본인 신당 기준으로 폴백 (구 신위전 페이지와 같은 규칙)
  let fmId = typeof member === 'string' && member.length > 0 ? member : null
  if (fmId) {
    const { data: fam } = await supabase
      .from('family_members')
      .select('id')
      .eq('id', fmId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!fam) fmId = null
  }

  const qs = fmId ? `&member=${fmId}` : ''
  const shrineHref = fmId ? `/protected/shrine?member=${fmId}` : '/protected/shrine'
  const devotion = await getDevotionStatus()

  return (
    <div className="min-h-screen w-full max-w-[520px] mx-auto px-3 py-5 pb-24">
      <Link
        href={shrineHref}
        className="inline-flex items-center gap-1 font-serif text-[12px] text-ink-light/50 hover:text-gold-300"
      >
        <ChevronLeft className="h-4 w-4" />
        신당으로
      </Link>

      <header className="mb-5 mt-2 space-y-1.5 text-center">
        <p className="font-serif text-[10px] tracking-[0.5em] text-gold-500/50">神 堂 一 覽</p>
        <h1 className="font-serif text-2xl font-bold text-ink-light">신당테마</h1>
        <p className="font-sans text-sm text-ink-light/50">신당에 들일 테마 · 아이템 · 신위 · 신수를 한 자리에서</p>
      </header>

      {/* 기원 보상 트랙 — 이 화면의 테마·신물이 곧 그 보상이다(위 머리말 참조) */}
      {devotion && <DevotionStrip devotion={devotion} />}

      <nav className="mb-6 grid grid-cols-4 gap-1.5" aria-label="신당 갈래">
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = key === tab
          return (
            <Link
              key={key}
              href={`/protected/shrine/collection?tab=${key}${qs}`}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 font-serif text-[11px] transition-colors ${
                active
                  ? 'border-gold-500/50 bg-gold-500/[0.12] font-bold text-gold-300'
                  : 'border-white/[0.08] bg-surface/40 text-ink-light/55'
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={1.5} />
              {label}
            </Link>
          )
        })}
      </nav>

      {tab === 'theme' && <ThemeTab familyMemberId={fmId} />}
      {tab === 'item' && <ItemTab />}
      {tab === 'deity' && <DeityTab familyMemberId={fmId} />}
      {tab === 'guardian' && <GuardianTab familyMemberId={fmId} />}
    </div>
  )
}

/**
 * 테마 탭 — 목록·보유 여부는 신당 씬 데이터에서 가져온다. 지금 걸린 테마(activePackCode)를
 * 알아야 「적용 중」을 그릴 수 있고, 그 값의 정본이 씬이기 때문이다.
 * 신당을 아직 만들지 않았으면 씬이 없다 → 목록만 보여 주고 적용 손잡이는 걸지 않는다
 * (입힐 신당이 없는데 「신당에 입히기」를 눌리게 두면 그 순간 막다른 길이 된다).
 */
async function ThemeTab({ familyMemberId }: { familyMemberId: string | null }) {
  const scene = await getSceneData(familyMemberId)
  if (!scene) {
    const themes = await listThemePacks()
    return <ThemeShopGrid themes={themes} />
  }
  return <ThemeShopGrid themes={scene.themes} apply={{ activeCode: scene.activePackCode, familyMemberId }} />
}

async function ItemTab() {
  const data = await getShopData()
  return (
    <div className="space-y-3">
      <p className="font-sans text-xs text-ink-light/40">신물은 보관함에 담기고, 신당 「꾸미기」에서 배치합니다</p>
      <ShrineShopClient data={data} />
    </div>
  )
}

/** 신수 탭 — 보유(인벤토리)와 착좌(shrines.guardians)를 함께 싣는다. 구매는 아이템 탭의 몫이다. */
async function GuardianTab({ familyMemberId }: { familyMemberId: string | null }) {
  const [ownedNames, scene] = await Promise.all([listOwnedGuardianNames(), getSceneData(familyMemberId)])
  return <GuardianGrid ownedNames={ownedNames} equipped={scene?.guardians ?? []} familyMemberId={familyMemberId} />
}

async function DeityTab({ familyMemberId }: { familyMemberId: string | null }) {
  const [catalog, bonds] = await Promise.all([listDeities(familyMemberId), getDeityBonds(familyMemberId)])
  return <DeityPantheon catalog={catalog} bonds={bonds} familyMemberId={familyMemberId} hideBackLink />
}
