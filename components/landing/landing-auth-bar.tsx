import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { cn } from '@/lib/utils'

/**
 * 랜딩 최상단 진입 바 — 신규(회원가입) / 기존(로그인) 분기를 첫 화면에 노출한다.
 *
 * 배치: 부모의 `relative` 컨테이너 기준 `absolute top-0`.
 * 레이아웃 공간을 차지하지 않으므로 뒤따르는 `min-h-[100dvh]` 히어로가 밀리지 않고,
 * 스크롤 시 자연스럽게 사라져 모달(EventPopup, z-[999])과도 충돌하지 않는다.
 */

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/80 focus-visible:ring-offset-2 focus-visible:ring-offset-background'

export async function LandingAuthBar() {
  const [tAuth, tLanding] = await Promise.all([getTranslations('auth'), getTranslations('landing')])

  return (
    <div className="absolute inset-x-0 top-0 z-50">
      {/* 상단 스크림 — 배경 사진이 밝아도 링크 명암비를 확보 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/80 to-transparent"
      />

      <nav aria-label="회원 진입" className="relative flex h-14 w-full items-center justify-end gap-1 px-3 sm:px-6">
        {/* 보조 — 기존 회원 */}
        <Link
          href="/auth/login"
          className={cn(
            'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg px-3',
            'font-sans text-[13px] tracking-wide text-ink-light/75 transition-colors duration-short hover:text-ink-light',
            FOCUS_RING
          )}
        >
          {tAuth('login')}
        </Link>

        {/* 주 CTA — 신규 방문자 */}
        <Link
          href="/auth/sign-up"
          className={cn(
            'inline-flex min-h-[44px] items-center justify-center rounded-lg px-4',
            'border border-gold-500/40 bg-gold-500/10 font-sans text-[13px] font-medium tracking-wide text-gold-400',
            'transition-colors duration-short hover:border-gold-500/60 hover:bg-gold-500/20 hover:text-gold-300',
            FOCUS_RING
          )}
        >
          {tLanding('cta')}
        </Link>
      </nav>
    </div>
  )
}
