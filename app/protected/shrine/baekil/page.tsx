import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getBaekilStatus } from '@/app/actions/shrine/rituals'
import { BaekilClient } from './baekil-client'

/**
 * 백일기도(百日祈禱) 전용 페이지 (CEO 지시 2026-07-30 — "페이지 기능이 커질 것 같으니 별도로 관리").
 *
 * 로그인·멤버십 게이트는 `app/protected/shrine/layout.tsx` 가 신당 계열 전체에 한 번에 건다 —
 * 여기서 다시 검사하면 게이트가 두 곳으로 갈라져 한쪽만 고치는 사고가 난다(오방기 페이지와 같은 규약).
 * 창방 팻말·방 하단 버튼·프로필 버튼이 전부 이 주소 하나를 가리킨다.
 *
 * ⚠️ 조회 실패·마이그레이션 미적용이면 `getBaekilStatus` 가 null 이다. 그때 진행도를 0 으로 그리면
 *    **진짜 0 일차와 구분이 안 되고**, 있지도 않은 서약을 시작하라고 권하게 된다. 그래서 값이 없으면
 *    아무 상태도 지어내지 않고 되돌린다(액막이·오방기와 같은 규율).
 */
export default async function BaekilPage() {
  const status = await getBaekilStatus()

  return (
    <div className="min-h-screen px-3 py-5">
      <div className="mx-auto w-full max-w-[480px] space-y-4">
        {status ? (
          <BaekilClient status={status} />
        ) : (
          <div className="rounded-2xl border border-gold-500/25 bg-surface/60 p-6 text-center">
            <p className="font-serif text-[10px] tracking-[0.3em] text-gold-500/60">百 日 祈 禱</p>
            <h1 className="mt-1 font-serif text-lg font-bold text-ink-primary">백일기도</h1>
            <p className="mt-3 font-sans text-[12px] leading-relaxed text-ink-primary/55">
              지금은 백일의 상을 차릴 수 없습니다.
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
