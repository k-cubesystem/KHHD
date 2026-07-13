import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, Clock, Headphones, Phone, ScrollText, Shield } from 'lucide-react'

export const metadata: Metadata = {
  title: '고객센터 | 청담해화당',
  description: '청담해화당 고객센터 — 문의 연락처 및 운영시간 안내',
}

export default function SupportPage() {
  return (
    <div className="w-full max-w-[480px] mx-auto px-3 text-ink-light font-sans relative pb-10">
      {/* Title */}
      <section className="flex flex-col items-center pt-12 pb-10 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
          <Headphones className="w-8 h-8 text-primary" strokeWidth={1} />
        </div>
        <h1 className="text-3xl font-serif text-ink-light mb-3">고객센터</h1>
        <p className="text-sm text-ink-light/60 font-light leading-relaxed">
          결제·환불, 멤버십, 분석 결과 등<br />
          서비스 이용에 관한 문의를 도와드립니다
        </p>
      </section>

      {/* Contact Card */}
      <section className="mb-10">
        <div className="bg-surface/40 border border-primary/20 divide-y divide-primary/10">
          <a
            href="tel:010-2311-2010"
            className="flex items-center justify-between p-5 hover:bg-surface/10 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <Phone className="w-5 h-5 text-primary/70 group-hover:text-primary transition-colors" strokeWidth={1} />
              <div>
                <p className="text-[10px] text-ink-light/40 tracking-widest uppercase font-bold mb-1">전화 문의</p>
                <p className="text-lg font-serif text-ink-light">010-2311-2010</p>
              </div>
            </div>
            <ChevronLeft className="w-4 h-4 text-ink-light/30 rotate-180 group-hover:text-ink-light transition-colors" />
          </a>

          <div className="flex items-center gap-4 p-5">
            <Clock className="w-5 h-5 text-primary/70" strokeWidth={1} />
            <div>
              <p className="text-[10px] text-ink-light/40 tracking-widest uppercase font-bold mb-1">운영시간</p>
              <p className="text-sm text-ink-light/80 font-light">평일 10:00–18:00 (주말·공휴일 휴무)</p>
            </div>
          </div>
        </div>
        <p className="text-[11px] text-ink-light/40 font-light leading-relaxed mt-3 px-1">
          운영시간 외 문의는 접수 순서대로 다음 영업일에 순차 회신드립니다.
        </p>
      </section>

      {/* Policy Links */}
      <section>
        <h2 className="text-[10px] text-ink-light/40 tracking-[0.2em] uppercase font-bold mb-3 px-1">약관 및 정책</h2>
        <div className="bg-surface/40 border border-primary/20 divide-y divide-primary/10">
          <Link
            href="/terms"
            className="flex items-center justify-between p-4 hover:bg-surface/10 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <ScrollText
                className="w-5 h-5 text-ink-light/50 group-hover:text-ink-light transition-colors"
                strokeWidth={1}
              />
              <span className="text-sm text-ink-light/80 group-hover:text-ink-light font-light">이용약관</span>
            </div>
            <ChevronLeft className="w-4 h-4 text-ink-light/30 rotate-180 group-hover:text-ink-light transition-colors" />
          </Link>
          <Link
            href="/privacy"
            className="flex items-center justify-between p-4 hover:bg-surface/10 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <Shield
                className="w-5 h-5 text-ink-light/50 group-hover:text-ink-light transition-colors"
                strokeWidth={1}
              />
              <span className="text-sm text-ink-light/80 group-hover:text-ink-light font-light">개인정보처리방침</span>
            </div>
            <ChevronLeft className="w-4 h-4 text-ink-light/30 rotate-180 group-hover:text-ink-light transition-colors" />
          </Link>
        </div>
      </section>
    </div>
  )
}
