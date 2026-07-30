import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getObangkiStatus } from '@/app/actions/shrine/rituals'
import { ObangkiClient } from './obangki-client'

/**
 * 오방기(五方旗) 점괘 전용 페이지 — 신당 룸 안 시트에서 옮겨 왔다(CEO 지시 2026-07-30).
 *
 * 로그인·멤버십 게이트는 `app/protected/shrine/layout.tsx` 가 신당 계열 전체에 한 번에 건다 —
 * 여기서 다시 검사하면 게이트가 두 곳으로 갈라져 한쪽만 고치는 사고가 난다(4차 CONCERN #1 의 반대편 함정).
 * 창방 팻말·방 하단 버튼·프로필 버튼이 전부 이 주소 하나를 가리킨다.
 */
export default async function ObangkiPage() {
  const status = await getObangkiStatus()

  return (
    <div className="min-h-screen px-3 py-5">
      <div className="mx-auto w-full max-w-[480px] space-y-4">
        {status ? (
          <ObangkiClient status={status} />
        ) : (
          // 현황 조회 실패 — 회차·잔여를 모른 채 깃발을 세우면 과금 판정이 서지 않는다.
          // 괘를 보여주지 않고 되돌린다(모호한 상태로 뽑게 두지 않는 것이 이 의식의 규율이다).
          <div className="rounded-2xl border border-gold-500/25 bg-surface/60 p-6 text-center">
            <p className="font-serif text-[10px] tracking-[0.3em] text-gold-500/60">五 方 旗</p>
            <h1 className="mt-1 font-serif text-lg font-bold text-ink-primary">오방기 점괘</h1>
            <p className="mt-3 font-sans text-[12px] leading-relaxed text-ink-primary/55">
              지금은 기를 세울 수 없습니다.
              <br />
              잠시 뒤 다시 들러 주세요.
            </p>
            <Link
              href="/protected/shrine"
              className="mt-5 inline-flex items-center gap-1 rounded-xl border border-gold-500/40 bg-gold-500/[0.08] px-4 py-2.5 font-serif text-[12px] font-bold text-gold-300"
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
