'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Crown, Check, ArrowRight } from 'lucide-react'
import { GA } from '@/lib/analytics/ga4'

interface MembershipGateProps {
  /** GA 라벨용 대상 식별자(counsel/shrine/family). */
  feature: string
  title: string
  description: string
  /** 혜택 리스트(玄·골드 업셀). */
  benefits: string[]
  /** 기능별 추가 입장로(예: 속풀이 광고 리워드 CTA) — 게이트는 내용을 모른 채 자리만 내준다. */
  footerSlot?: React.ReactNode
}

/**
 * 멤버십 게이트(업셀 화면) — 玄·골드, 혜택 리스트, 상점 멤버십 탭 CTA(DESIGN.md 준수).
 * 리다이렉트 없이 in-place 로 렌더 → 데이터는 보존, 가입 즉시 router.refresh 로 통과.
 * 마스터(admin)·멤버는 서버에서 이 컴포넌트를 렌더하지 않는다(privileges + subscription 경유).
 *
 * 🔴 여기서 파는 것은 멤버십 하나다. 입장만 여는 «1일 이용권»은 판매 종료됐다(빈 방 열쇠가 됐다).
 */
export function MembershipGate({ feature, title, description, benefits, footerSlot }: MembershipGateProps) {
  const router = useRouter()

  useEffect(() => {
    GA.paywallView()
  }, [])

  const goMembership = () => {
    GA.paywallClick(`gate_${feature}`)
    router.push('/protected/store?tab=membership')
  }

  return (
    <div className="w-full max-w-[480px] mx-auto px-4 py-12">
      <div
        className="relative overflow-hidden rounded-2xl border border-gold-500/30 p-7 text-center"
        style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.10) 0%, rgba(158,43,43,0.05) 100%)' }}
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-500/50 to-transparent" />

        <div className="relative flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-gold-500/[0.12] border border-gold-500/30 flex items-center justify-center">
            <Crown className="w-8 h-8 text-gold-400" strokeWidth={1.2} />
          </div>
        </div>

        <p className="relative text-[10px] tracking-[0.3em] text-gold-500/50 uppercase font-sans mb-2">멤버십 전용</p>
        <h2 className="relative text-xl font-serif font-bold text-ink-light mb-2">{title}</h2>
        <p className="relative text-sm text-ink-light/60 font-sans font-light leading-relaxed mb-5">{description}</p>

        <ul className="relative text-left space-y-2 mb-6 max-w-[320px] mx-auto">
          {benefits.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-ink-light/75 font-sans font-light">
              <Check className="w-4 h-4 text-gold-400 mt-0.5 shrink-0" />
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={goMembership}
          className="relative w-full h-12 rounded-xl bg-gold-500/15 border border-gold-500/45 text-gold-300 font-serif font-bold text-sm flex items-center justify-center gap-2 hover:bg-gold-500/25 transition-colors"
        >
          멤버십 시작하기
          <ArrowRight className="w-4 h-4" />
        </button>

        {footerSlot && <div className="relative">{footerSlot}</div>}
      </div>
    </div>
  )
}
