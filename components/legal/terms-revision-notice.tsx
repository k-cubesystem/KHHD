import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { isTermsNoticeActive, termsNoticeLine } from '@/lib/domain/legal/terms-revision'

/**
 * 약관 개정 공지 띠 — 서비스 초기 화면(랜딩·허브)에 건다(약관 제3조 제3항).
 * 공지 기간이 지나면 스스로 사라진다 — 내리는 것을 잊어도 낡은 공지가 남지 않는다.
 */
export function TermsRevisionNotice() {
  if (!isTermsNoticeActive()) return null

  return (
    <div className="w-full px-4 pt-3">
      <Link
        href="/terms"
        className="group mx-auto flex w-full max-w-[420px] items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition-colors hover:border-gold-500/30"
      >
        <span className="flex flex-col text-left">
          <span className="font-sans text-[12.5px] font-bold text-ink-light">{termsNoticeLine()}</span>
          <span className="mt-0.5 font-sans text-[11.5px] text-ink-light/70">
            바뀌는 내용과 종전 약관을 함께 보실 수 있습니다
          </span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-gold-500 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  )
}
