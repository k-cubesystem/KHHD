import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getChuljeonStatus } from '@/app/actions/shrine/rituals'
import { ChuljeonRitual } from '@/components/shrine/scene/ChuljeonSheet'

/**
 * 척전(擲錢) 「엽전 세 닢」 전용 페이지 — 갈림길을 정하는 의식 R-4.
 *
 * 로그인·멤버십 게이트는 `app/protected/shrine/layout.tsx` 가 신당 계열 전체에 한 번에 건다 —
 * 여기서 다시 검사하면 게이트가 두 곳으로 갈라져 한쪽만 고치는 사고가 난다.
 * 연출 CSS(app/shrine-scene.css)도 그 layout 이 적재한다(오방기 페이지 영구 교착 P0 의 교훈).
 */
export default async function ChuljeonPage() {
  const status = await getChuljeonStatus()

  return (
    <div className="min-h-screen px-3 py-5">
      <div className="mx-auto w-full max-w-[480px] space-y-4">
        {status ? (
          <ChuljeonRitual status={status} />
        ) : (
          // 현황 조회 실패 — 남은 횟수를 모른 채 던지게 두지 않는다(다른 의식과 같은 규율)
          <div className="rounded-2xl border border-gold-500/25 bg-surface/60 p-6 text-center">
            <p className="font-serif text-[10px] tracking-[0.3em] text-gold-500/60">擲 錢</p>
            <h1 className="mt-1 font-serif text-lg font-bold text-ink-primary">엽전 세 닢</h1>
            <p className="mt-3 font-sans text-[12px] leading-relaxed text-ink-primary/55">
              지금은 쟁반을 펼 수 없습니다.
              <br />
              잠시 뒤 다시 들러 주세요.
            </p>
            <Link
              href="/protected/shrine"
              className="mt-5 inline-flex items-center gap-1 rounded-lg border border-gold-500/40 bg-gold-500/[0.08] px-4 py-2.5 font-serif text-[12px] font-bold text-gold-300"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              신당으로
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
