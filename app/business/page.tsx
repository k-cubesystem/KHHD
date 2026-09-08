'use client'

import { useState } from 'react'
import Link from 'next/link'
import { submitBusinessInquiry, type BusinessInquiryFormData } from '@/app/actions/core/business-inquiry'
import { FAQ_ITEMS, PRICING_TIERS, PROCESS_STEPS, TRUST_FACTS, VALUE_PROPS } from './copy'

// 🔴 화면 문구는 전부 ./copy.ts 단일 출처다 — 근거 없는 주장이 다시 스며들지 않도록
//    금지어·실적 수치·무료 체험 회귀는 ./__tests__/copy.test.ts 가 막는다.

// ─── FAQ Accordion ───────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gold-700/30">
      <button
        className="w-full text-left py-5 flex items-center justify-between gap-4 group"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-sm text-ink-primary/90 group-hover:text-gold-300 transition-colors leading-snug">
          {q}
        </span>
        <span className={`shrink-0 text-gold-500 text-lg transition-transform duration-300 ${open ? 'rotate-45' : ''}`}>
          +
        </span>
      </button>
      {open && <p className="pb-5 text-sm text-ink-primary/60 leading-relaxed">{a}</p>}
    </div>
  )
}

// ─── Contact Form ─────────────────────────────────────────────────────────────

function ContactForm() {
  const [form, setForm] = useState<BusinessInquiryFormData>({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    employee_count: '',
    message: '',
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    const res = await submitBusinessInquiry(form)
    setResult(res)
    setLoading(false)
    if (res.success) {
      setForm({
        company_name: '',
        contact_name: '',
        email: '',
        phone: '',
        employee_count: '',
        message: '',
      })
    }
  }

  const inputCls =
    'w-full bg-black/40 border border-gold-700/40 rounded-lg px-4 py-3 text-sm text-ink-primary placeholder-ink-primary/30 focus:outline-none focus:border-gold-500/70 focus:ring-1 focus:ring-gold-500/30 transition-colors'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gold-300/70 mb-1.5">
            회사명 <span className="text-gold-500">*</span>
          </label>
          <input
            name="company_name"
            value={form.company_name}
            onChange={handleChange}
            placeholder="(주)해화당"
            className={inputCls}
            required
          />
        </div>
        <div>
          <label className="block text-xs text-gold-300/70 mb-1.5">
            담당자 이름 <span className="text-gold-500">*</span>
          </label>
          <input
            name="contact_name"
            value={form.contact_name}
            onChange={handleChange}
            placeholder="홍길동"
            className={inputCls}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gold-300/70 mb-1.5">
            이메일 <span className="text-gold-500">*</span>
          </label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="contact@company.com"
            className={inputCls}
            required
          />
        </div>
        <div>
          <label className="block text-xs text-gold-300/70 mb-1.5">연락처</label>
          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="010-0000-0000"
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-gold-300/70 mb-1.5">
          직원 수 <span className="text-gold-500">*</span>
        </label>
        <select name="employee_count" value={form.employee_count} onChange={handleChange} className={inputCls} required>
          <option value="" disabled>
            직원 수를 선택해주세요
          </option>
          <option value="10인 미만">10인 미만</option>
          <option value="10~30인">10~30인 (스타트업)</option>
          <option value="31~100인">31~100인 (중소기업)</option>
          <option value="101~300인">101~300인</option>
          <option value="301~500인">301~500인</option>
          <option value="500인 이상">500인 이상 (대기업)</option>
        </select>
      </div>

      <div>
        <label className="block text-xs text-gold-300/70 mb-1.5">문의 내용</label>
        <textarea
          name="message"
          value={form.message}
          onChange={handleChange}
          rows={4}
          placeholder="도입 목적, 원하는 서비스, 기타 문의사항을 자유롭게 작성해주세요."
          className={inputCls}
        />
      </div>

      {result && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            result.success
              ? 'bg-gold-700/15 border border-gold-600/40 text-gold-200'
              : 'bg-error-light border border-error-border text-error-text'
          }`}
        >
          {result.success ? '문의가 접수되었습니다. 영업일 1~2일 내 담당자가 연락드리겠습니다.' : result.error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 bg-gradient-to-r from-gold-700 to-gold-600 hover:from-gold-600 hover:to-gold-500 disabled:opacity-50 text-ink-primary font-semibold rounded-lg transition-all duration-200 text-sm tracking-wide"
      >
        {loading ? '접수 중...' : '도입 문의하기'}
      </button>
    </form>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function BusinessPage() {
  return (
    <div className="min-h-screen bg-[#0A0A08] text-ink-primary">
      {/* ── Navigation ── */}
      <nav className="sticky top-0 z-50 border-b border-gold-700/20 bg-[#0A0A08]/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-gold-500 font-serif text-lg tracking-tight">해화당</span>
            <span className="text-gold-700/60 text-xs">기업 솔루션</span>
          </Link>
          <a
            href="#contact"
            className="px-4 py-2 bg-gold-700/80 hover:bg-gold-600 text-ink-primary text-xs font-medium rounded-lg transition-colors"
          >
            도입 문의하기
          </a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gold-700/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto px-6 py-28 text-center relative">
          <div className="inline-block mb-6">
            <span className="px-4 py-1.5 bg-gold-700/20 border border-gold-700/40 rounded-full text-xs text-gold-500 tracking-widest uppercase">
              Enterprise · B2B Solution
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-semibold text-ink-primary leading-tight tracking-tight mb-6">
            직원 복지의
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-400 to-gold-200">
              새로운 패러다임
            </span>
          </h1>
          <p className="text-lg text-ink-primary/60 max-w-2xl mx-auto mb-10 leading-relaxed">
            오래 이어져 온 전통 명리학(命理學)을 AI로 옮겼습니다.
            <br />
            직원 개개인의 타고난 기질과 운기를 읽어, 기업 복지에 새로운 결을 더합니다.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#contact"
              className="px-8 py-4 bg-gradient-to-r from-gold-700 to-gold-500 hover:from-gold-600 hover:to-gold-400 text-ink-primary font-semibold rounded-xl transition-all duration-200 text-sm shadow-lg shadow-gold-700/30"
            >
              도입 상담 신청
            </a>
            <a
              href="#pricing"
              className="px-8 py-4 border border-gold-700/50 hover:border-gold-500/70 text-gold-300 hover:text-gold-200 rounded-xl transition-colors text-sm"
            >
              상담 범위 보기
            </a>
          </div>

          {/* 확인할 수 있는 사실 — 실적 통계(도입 기업 수·갱신율·만족도)는 실데이터가 없어 싣지 않는다 */}
          <div className="mt-20">
            <p className="text-xs tracking-[0.18em] text-gold-500/70">확인할 수 있는 사실</p>
            <ul className="mt-3 flex flex-wrap items-center justify-center gap-2 list-none p-0 m-0">
              {TRUST_FACTS.map((fact) => (
                <li
                  key={fact.label}
                  className="rounded-full border border-gold-700/40 bg-gold-700/10 px-4 py-1.5 text-xs text-ink-primary/70"
                >
                  {fact.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Value Props ── */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <h2 className="text-2xl sm:text-3xl font-serif text-ink-primary mb-3">명리학이 기업에 가져다주는 것</h2>
          <p className="text-sm text-ink-primary/50 max-w-xl mx-auto">
            오래 이어져 온 동양 철학의 통찰을 현대 기업 문화에 접목합니다
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {VALUE_PROPS.map((vp) => (
            <div
              key={vp.title}
              className="p-7 rounded-2xl border border-gold-700/30 bg-surface/60 hover:border-gold-700/50 transition-colors group"
            >
              <div className="text-3xl mb-4">{vp.icon}</div>
              <h3 className="font-serif text-gold-200 text-lg mb-3 group-hover:text-ink-primary transition-colors">
                {vp.title}
              </h3>
              <p className="text-sm text-ink-primary/50 leading-relaxed">{vp.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="bg-surface/40 border-y border-gold-700/20 py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-serif text-ink-primary mb-3">도입 프로세스</h2>
            <p className="text-sm text-ink-primary/50">문의부터 계약까지 담당자가 함께 진행합니다</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            {PROCESS_STEPS.map((item, i) => (
              <div key={item.step} className="relative text-center">
                {i < 3 && (
                  <div className="hidden sm:block absolute top-6 left-full w-full h-px bg-gradient-to-r from-gold-700/40 to-transparent -translate-y-1/2 z-0" />
                )}
                <div className="relative z-10 w-12 h-12 mx-auto mb-4 rounded-full bg-gold-700/20 border border-gold-700/50 flex items-center justify-center">
                  <span className="text-xs font-mono text-gold-500">{item.step}</span>
                </div>
                <h4 className="font-serif text-gold-200 text-sm mb-2">{item.title}</h4>
                <p className="text-xs text-ink-primary/40 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 도입 상담 범위 (구 «기업 요금제» — 공개된 표준 요금제가 없어 금액을 싣지 않는다) ── */}
      <section id="pricing" className="max-w-5xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <h2 className="text-2xl sm:text-3xl font-serif text-ink-primary mb-3">도입 상담 범위</h2>
          <p className="text-sm text-ink-primary/50 max-w-xl mx-auto">
            기업 규모에 따라 다루는 범위가 달라집니다. 비용과 계약 조건은 상담에서 함께 확정합니다.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.name}
              className="relative rounded-2xl p-7 border flex flex-col border-gold-700/30 bg-surface/40"
            >
              <div className="mb-6">
                <h3 className="font-serif text-gold-200 text-xl mb-1">{tier.name}</h3>
                <p className="text-xs text-ink-primary/40">{tier.subtitle}</p>
              </div>
              <div className="mb-6">
                <div className="text-2xl font-serif text-gold-300 font-semibold">{tier.price}</div>
                <div className="text-xs text-ink-primary/30 mt-0.5">{tier.priceNote}</div>
              </div>
              <ul className="space-y-2.5 mb-8 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-xs text-ink-primary/60">
                    <span className="text-gold-500 mt-0.5 shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="#contact"
                className="block text-center py-3 rounded-xl text-xs font-medium transition-colors border border-gold-700/50 hover:border-gold-600 text-gold-500 hover:text-gold-300"
              >
                {tier.cta}
              </a>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-ink-primary/30 mt-6">
          * 비용·계약 조건은 도입 상담에서 안내드립니다. 현재 공개된 표준 요금제는 없습니다.
        </p>
      </section>

      {/* ── FAQ ── */}
      <section className="max-w-3xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <h2 className="text-2xl sm:text-3xl font-serif text-ink-primary mb-3">자주 묻는 질문</h2>
        </div>
        <div>
          {FAQ_ITEMS.map((item) => (
            <FaqItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </section>

      {/* ── Contact Form ── */}
      <section id="contact" className="bg-surface/40 border-t border-gold-700/20 py-24">
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-serif text-ink-primary mb-3">도입 문의하기</h2>
            <p className="text-sm text-ink-primary/50 max-w-md mx-auto">
              양식을 작성해주시면 영업일 1~2일 내 담당자가 연락드립니다.
            </p>
          </div>
          <div className="p-8 rounded-2xl border border-gold-700/30 bg-black/30">
            <ContactForm />
          </div>
          <p className="text-center text-xs text-ink-primary/30 mt-6">직접 문의: 010-2311-2010 · 평일 10:00–18:00</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gold-700/20 py-10">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-gold-500">해화당 (海華堂)</span>
            <span className="text-xs text-ink-primary/30">기업 솔루션</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-ink-primary/30">
            <Link href="/terms" className="hover:text-gold-500 transition-colors">
              이용약관
            </Link>
            <Link href="/privacy" className="hover:text-gold-500 transition-colors">
              개인정보처리방침
            </Link>
            <Link href="/" className="hover:text-gold-500 transition-colors">
              개인 서비스
            </Link>
          </div>
          <p className="text-xs text-ink-primary/20">© 2026 큐브시스템. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
