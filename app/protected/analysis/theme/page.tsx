import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ServiceDisclaimer } from '@/components/shared/ServiceDisclaimer'
import { ThemeThumbnail } from '@/components/analysis/ThemeThumbnail'
import {
  hasThemeReading,
  openRoutes,
  resolveThemeTab,
  routeCostLabel,
  THEME_TABS,
  themeAnchorId,
  themeCostLabel,
  themeEntryHref,
  themeEntryLabel,
  themesByTab,
  isFreeRoute,
  isFreeTheme,
  type ThemeFortune,
} from '@/lib/domain/theme-fortune/themes'

export const metadata: Metadata = {
  title: '인기테마운세',
  description: '지금 사람들이 가장 많이 묻는 질문으로 골라 보는 사주 풀이',
}

/**
 * 인기테마운세 목록 — 「도구」가 아니라 「질문」으로 고르는 화면.
 *
 * ## 🔴 여기서 AI 를 부르지 않는다
 * 카드는 제목·서브카피·그림만 그린다. 9차에 「오늘의 운세 카드가 마운트마다 Gemini 생성」
 * 사고가 났다 — 목록은 서버 컴포넌트이고 서버 액션을 하나도 호출하지 않는다.
 *
 * ## 🔴 오늘의 운세·2026 병오년의 유일한 입구
 * 허브 비우기(CEO 2026-08-13)로 「더 깊이 들여다보기」가 없어지면서 두 화면은 링크가 한 곳도
 * 남지 않았다. 하단 「지금 바로 볼 수 있는 풀이」가 지금 그 둘의 유일한 경로다.
 *
 * ## 🔴 카드가 «실제로 가는 곳»만 적는다
 * 개별 풀이가 선 테마는 자기 화면(`/analysis/theme/{id}`)으로, 아직 없는 테마는 **지금 실제로
 * 돌아가는 화면**으로 이어지고 어디로 가는지를 카드 위에 적는다. 전 사용자 동일 「85점」을
 * 띄우던 목업으로는 보내지 않는다(그 라우트는 리다이렉트·상세 렌더가 됐다).
 *
 * 탭은 평범한 링크(`?tab=`)다 — JS 없이도 동작하고, 허브에서 넘어온 앵커(`#theme-{id}`)가
 * 그대로 살아 있어야 «내가 누른 카드»가 어디인지 보인다.
 */
export default async function ThemeFortuneListPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: rawTab } = await searchParams
  const tab = resolveThemeTab(rawTab)
  const themes = themesByTab(tab)

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-screen-sm px-4 pb-32 pt-6">
        <div className="mb-4 flex items-center justify-between">
          <Link
            href="/protected/analysis"
            className="inline-flex items-center gap-1 text-xs text-ink-light/50 transition-colors hover:text-ink-light"
          >
            <ChevronLeft className="h-4 w-4" />
            사주·궁합으로
          </Link>
        </div>

        <header className="mb-5 space-y-1.5 text-center">
          <p className="font-serif text-[10px] tracking-[0.5em] text-gold-500/50">THEME</p>
          <h1 className="font-serif text-2xl font-bold text-ink-light">인기테마운세</h1>
          <p className="font-sans text-sm text-ink-light/50">지금 사람들이 가장 많이 묻는 것부터</p>
        </header>

        {/* 탭 바 — 라벨·구성은 themes.ts 한 곳에서 온다 */}
        <nav className="mb-6 grid grid-cols-4 gap-1.5" aria-label="테마 갈래">
          {THEME_TABS.map(({ key, label }) => {
            const active = key === tab
            return (
              <Link
                key={key}
                href={`/protected/analysis/theme?tab=${key}`}
                aria-current={active ? 'page' : undefined}
                className={`rounded-xl border py-2.5 text-center font-serif text-[12px] transition-colors ${
                  active
                    ? 'border-gold-500/50 bg-gold-500/[0.12] font-bold text-gold-300'
                    : 'border-white/10 bg-surface/40 text-ink-light/55'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        {/* 2열 그리드. 첫 줄(두 장)만 즉시 받고 나머지는 스크롤할 때 — 허브 리스트와 같은 규율. */}
        <div className="grid grid-cols-2 gap-3">
          {themes.map((theme, index) => (
            <ThemeCard key={theme.id} theme={theme} eager={index < 2} />
          ))}
        </div>

        {/* 🔴 오늘의 운세·2026 병오년은 **이 블록이 유일한 진입 경로**다(허브에서 내려왔다).
            링크를 빼면 두 기능이 접근 불가가 된다 — 목록은 themes.ts 의 `openRoutes()` 하나. */}
        <section className="mt-8 space-y-3" aria-labelledby="theme-open-routes">
          <div className="dancheong-divider my-4" />
          <h2 id="theme-open-routes" className="px-1 font-serif text-sm text-gold-500/80">
            지금 바로 볼 수 있는 풀이
          </h2>
          <p className="px-1 text-[11px] font-light leading-relaxed text-ink-light/50">
            아직 자기 풀이가 없는 카드는 아래 풀이로 이어집니다. 오늘의 운세·2026 병오년도 여기서 바로 열립니다.
          </p>
          <ul className="flex flex-wrap gap-2">
            {openRoutes().map((route) => (
              <li key={route.href}>
                <Link
                  href={route.href}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gold-500/20 bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-ink-light/70 transition-colors hover:border-gold-500/40 hover:text-ink-light"
                >
                  {route.label}
                  {/* 표시 = 실차감. 값은 feature-costs.ts 한 곳에서만 온다. */}
                  <span
                    className={`rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${
                      isFreeRoute(route)
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                        : 'border-gold-500/20 bg-gold-500/10 text-gold-300'
                    }`}
                  >
                    {routeCostLabel(route)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-8">
          <ServiceDisclaimer />
        </div>
      </div>
    </div>
  )
}

/**
 * 테마 카드.
 *
 * 개별 풀이가 선 테마는 **자기 풀이 화면**으로 가고, 아직 없는 테마는 지금 돌아가는 화면으로
 * 가면서 「지금은 ○○로 이어집니다」를 카드에 적는다. 어디로 가는지·얼마인지를 누르기 **전에**
 * 밝혀야 표시와 내용이 어긋나지 않는다.
 *
 * 🔴 복채 배지는 **가는 곳을 따라간다**(`themeCostLabel`). 링크만 풀이로 바꾸고 배지가 옛 도착
 *    화면 값을 쓰면 「무료」라고 적힌 카드가 복채를 받는다.
 *
 * 🔴 그림은 허브 리스트와 **같은 컴포넌트·같은 파일**을 쓴다(`ThemeThumbnail`). 허브에서 본
 *    그림과 목록에서 만나는 그림이 다르면 누른 사람이 «다른 걸 눌렀나» 하게 된다.
 */
function ThemeCard({ theme, eager }: { theme: ThemeFortune; eager: boolean }) {
  const href = themeEntryHref(theme)
  const entryLabel = themeEntryLabel(theme)
  const anchor = themeAnchorId(theme.id)

  const body = (
    <>
      <ThemeThumbnail theme={theme} eager={eager} className="aspect-[16/9] w-full" />

      <div className="p-3">
        <h3 className="font-serif text-[13px] font-bold leading-snug text-ink-light">{theme.title}</h3>
        <p className="mt-1 text-[11px] font-light leading-relaxed text-ink-light/60">{theme.subcopy}</p>

        <div className="mt-2.5 flex items-center gap-1.5">
          <span
            className={`rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${
              isFreeTheme(theme)
                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                : 'border-gold-500/20 bg-gold-500/10 text-gold-300'
            }`}
          >
            {themeCostLabel(theme)}
          </span>
          {theme.input === 'PAIR' && (
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9px] text-ink-light/60">
              두 사람
            </span>
          )}
        </div>

        {hasThemeReading(theme) ? (
          <p className="mt-2 flex items-center gap-0.5 text-[10px] text-gold-300/70">
            풀이 보기
            <ChevronRight className="h-3 w-3" />
          </p>
        ) : entryLabel ? (
          <p className="mt-2 flex items-center gap-0.5 text-[10px] text-ink-light/40">
            지금은 {entryLabel}로<ChevronRight className="h-3 w-3" />
          </p>
        ) : (
          <p className="mt-2 text-[10px] text-ink-light/40">개별 풀이 준비 중</p>
        )}
      </div>
    </>
  )

  const shell =
    'relative block overflow-hidden rounded-xl border target:border-gold-500/60 target:bg-gold-500/[0.06] scroll-mt-20'

  // 갈 곳이 없는 테마는 링크로 만들지 않는다 — 눌러도 아무 데도 못 가는 카드를 만들지 않는다.
  if (!href) {
    return (
      <div id={anchor} className={`${shell} border-white/10 bg-surface/30 opacity-70`}>
        {body}
      </div>
    )
  }

  return (
    <Link
      id={anchor}
      href={href}
      aria-label={`${theme.title} — ${entryLabel ?? '풀이 보기'}`}
      className={`${shell} group border-white/10 bg-surface/60 transition-colors hover:border-gold-500/30 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-500/60`}
    >
      {body}
    </Link>
  )
}
