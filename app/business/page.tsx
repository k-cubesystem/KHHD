'use client'

import { useState } from 'react'
import Link from 'next/link'
import { submitBusinessInquiry, type BusinessInquiryFormData } from '@/app/actions/core/business-inquiry'

// ─── FAQ Data ────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: '도입 후 직원들은 어떻게 서비스를 이용하나요?',
    a: '계약 완료 후 기업 전용 접속 코드 또는 SSO 링크를 제공합니다. 직원들은 별도 회원가입 없이 바로 사주 분석 및 운세 리포트를 이용할 수 있습니다.',
  },
  {
    q: '사주 분석 데이터는 안전하게 관리되나요?',
    a: '모든 개인정보는 국내 서버에 암호화 저장되며, 기업 도입 계약 시 별도 개인정보처리방침 및 DPA(Data Processing Agreement)를 체결합니다. 직원 데이터는 제3자에게 공유되지 않습니다.',
  },
  {
    q: '팀 궁합 분석은 어떻게 진행되나요?',
    a: '팀원들의 사주 데이터를 기반으로 AI가 협업 시너지, 갈등 요소, 역할 적합도를 분석합니다. HR 담당자용 어드민 대시보드에서 팀별 궁합 리포트를 확인할 수 있습니다.',
  },
  {
    q: '최소 계약 인원이 있나요?',
    a: '스타트업 플랜은 최소 10인부터 도입 가능합니다. 10인 미만 소규모 팀의 경우 개인 멤버십 패키지를 추천드립니다.',
  },
  {
    q: '계약 기간과 해지 조건은 어떻게 되나요?',
    a: '기본 계약 기간은 1년이며, 연 단위 갱신입니다. 계약 만료 30일 전 해지 의사를 전달하면 위약금 없이 계약 종료가 가능합니다.',
  },
  {
    q: '기업 맞춤 보고서는 어떤 형태로 제공되나요?',
    a: '월별 직원 운세 트렌드, 신규 채용 적합도 분석, 연간 기업 운세 리포트를 PDF 및 대시보드 형태로 제공합니다. 브랜딩 커스터마이징도 가능합니다.',
  },
]

// ─── Pricing Tiers ───────────────────────────────────────────────────────────

const PRICING_TIERS = [
  {
    name: '스타트업',
    subtitle: '30인 이하',
    price: '월 49만원',
    priceNote: '부가세 별도',
    features: [
      '직원 30인 사주 분석 무제한',
      '팀 궁합 분석 월 5회',
      '월별 운세 리포트 자동 발송',
      '기본 어드민 대시보드',
      '이메일 고객지원',
    ],
    cta: '스타트업 플랜 문의',
    highlight: false,
  },
  {
    name: '중소기업',
    subtitle: '100인 이하',
    price: '월 129만원',
    priceNote: '부가세 별도',
    features: [
      '직원 100인 사주 분석 무제한',
      '팀 궁합 분석 월 20회',
      '주간·월간 운세 리포트',
      '채용 적합도 분석 월 10회',
      '전담 어드민 대시보드',
      '전화·이메일 우선 지원',
    ],
    cta: '중소기업 플랜 문의',
    highlight: true,
  },
  {
    name: '대기업',
    subtitle: '500인 이상',
    price: '맞춤 견적',
    priceNote: '별도 협의',
    features: [
      '무제한 직원 사주 분석',
      '팀 궁합 분석 무제한',
      '기업 맞춤 AI 운세 컨설팅',
      '채용·승진 적합도 분석',
      '브랜드 커스텀 리포트',
      '전담 컨설턴트 배정',
      'API 연동 지원',
    ],
    cta: '엔터프라이즈 문의',
    highlight: false,
  },
]

// ─── Testimonials ────────────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    quote:
      '팀 빌딩 워크숍에 해화당 사주 궁합 분석을 활용했더니 직원들의 참여도가 눈에 띄게 올랐습니다. 단순한 복지 혜택을 넘어 팀 결속력 강화 도구로 활용하고 있습니다.',
    author: '김OO 대표',
    company: '핀테크 스타트업 (직원 28인)',
  },
  {
    quote:
      '채용 시즌마다 지원자 사주 분석을 참고자료로 활용합니다. 물론 최종 결정은 역량 기반이지만, 팀 문화 적합도를 가늠하는 보조 데이터로 매우 유용합니다.',
    author: '이OO HR팀장',
    company: 'IT 중견기업 (직원 120인)',
  },
  {
    quote:
      '전 직원 신년 운세 리포트를 복지 혜택으로 제공했습니다. "회사가 나를 챙겨준다"는 감정적 연결이 실제 직원 만족도 설문에서 긍정적으로 반영됐습니다.',
    author: '박OO 총무이사',
    company: '제조 중소기업 (직원 85인)',
  },
]

// ─── Value Props ─────────────────────────────────────────────────────────────

const VALUE_PROPS = [
  {
    icon: '☯',
    title: '팀 궁합 분석',
    desc: '오행(五行) 기반 AI 알고리즘으로 팀원 간 시너지와 갈등 요인을 파악합니다. 최적의 팀 구성과 업무 분장을 데이터로 뒷받침합니다.',
  },
  {
    icon: '📊',
    title: '직원 운세 리포트',
    desc: '월별·연간 개인 운세 리포트를 자동 생성합니다. 직원 개개인이 자신의 운기(運氣)를 파악하고 중요한 의사결정에 활용할 수 있습니다.',
  },
  {
    icon: '🏛',
    title: '기업 맞춤 컨설팅',
    desc: '신규 채용 적합도, 프로젝트 성공 운, 기업 전체 연간 운세 등 경영 판단에 활용할 수 있는 맞춤형 운명 컨설팅을 제공합니다.',
  },
  {
    icon: '🔒',
    title: '엄격한 데이터 보안',
    desc: '국내 서버 암호화 저장, DPA 계약, RLS(행 수준 보안) 적용. 직원 개인정보는 기업 계정 외부로 절대 유출되지 않습니다.',
  },
]

// ─── FAQ Accordion ───────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-amber-900/30">
      <button
        className="w-full text-left py-5 flex items-center justify-between gap-4 group"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-sm text-amber-100/90 group-hover:text-amber-300 transition-colors leading-snug">{q}</span>
        <span
          className={`shrink-0 text-amber-500 text-lg transition-transform duration-300 ${open ? 'rotate-45' : ''}`}
        >
          +
        </span>
      </button>
      {open && <p className="pb-5 text-sm text-amber-100/60 leading-relaxed">{a}</p>}
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
    'w-full bg-black/40 border border-amber-900/40 rounded-lg px-4 py-3 text-sm text-amber-100 placeholder-amber-100/30 focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/30 transition-colors'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-amber-400/70 mb-1.5">
            회사명 <span className="text-amber-500">*</span>
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
          <label className="block text-xs text-amber-400/70 mb-1.5">
            담당자 이름 <span className="text-amber-500">*</span>
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
          <label className="block text-xs text-amber-400/70 mb-1.5">
            이메일 <span className="text-amber-500">*</span>
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
          <label className="block text-xs text-amber-400/70 mb-1.5">연락처</label>
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
        <label className="block text-xs text-amber-400/70 mb-1.5">
          직원 수 <span className="text-amber-500">*</span>
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
        <label className="block text-xs text-amber-400/70 mb-1.5">문의 내용</label>
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
              ? 'bg-amber-900/30 border border-amber-600/40 text-amber-200'
              : 'bg-red-900/30 border border-red-600/40 text-red-300'
          }`}
        >
          {result.success ? '문의가 접수되었습니다. 영업일 1~2일 내 담당자가 연락드리겠습니다.' : result.error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 disabled:opacity-50 text-amber-100 font-semibold rounded-lg transition-all duration-200 text-sm tracking-wide"
      >
        {loading ? '접수 중...' : '도입 문의하기'}
      </button>
    </form>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function BusinessPage() {
  return (
    <div className="min-h-screen bg-[#0A0A08] text-amber-100">
      {/* ── Navigation ── */}
      <nav className="sticky top-0 z-50 border-b border-amber-900/20 bg-[#0A0A08]/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-amber-400 font-serif text-lg tracking-tight">해화당</span>
            <span className="text-amber-700/60 text-xs">기업 솔루션</span>
          </Link>
          <a
            href="#contact"
            className="px-4 py-2 bg-amber-700/80 hover:bg-amber-600 text-amber-100 text-xs font-medium rounded-lg transition-colors"
          >
            도입 문의하기
          </a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-amber-800/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto px-6 py-28 text-center relative">
          <div className="inline-block mb-6">
            <span className="px-4 py-1.5 bg-amber-900/40 border border-amber-700/40 rounded-full text-xs text-amber-400 tracking-widest uppercase">
              Enterprise · B2B Solution
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-semibold text-amber-100 leading-tight tracking-tight mb-6">
            직원 복지의
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">
              새로운 패러다임
            </span>
          </h1>
          <p className="text-lg text-amber-100/60 max-w-2xl mx-auto mb-10 leading-relaxed">
            천년의 지혜, 전통 명리학(命理學)을 AI로 현대화했습니다.
            <br />
            직원 개개인의 타고난 기질과 운기를 분석해 팀 시너지를 극대화하고, 기업 복지의 새로운 차원을 열어드립니다.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#contact"
              className="px-8 py-4 bg-gradient-to-r from-amber-700 to-amber-500 hover:from-amber-600 hover:to-amber-400 text-amber-100 font-semibold rounded-xl transition-all duration-200 text-sm shadow-lg shadow-amber-900/30"
            >
              무료 도입 상담 신청
            </a>
            <a
              href="#pricing"
              className="px-8 py-4 border border-amber-700/50 hover:border-amber-500/70 text-amber-300 hover:text-amber-200 rounded-xl transition-colors text-sm"
            >
              요금제 보기
            </a>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            {[
              { num: '2,400+', label: '분석 완료 직원' },
              { num: '98%', label: '갱신율' },
              { num: '4.9/5', label: '기업 만족도' },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-2xl font-serif text-amber-300 font-semibold">{s.num}</div>
                <div className="text-xs text-amber-100/40 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Value Props ── */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <h2 className="text-2xl sm:text-3xl font-serif text-amber-100 mb-3">명리학이 기업에 가져다주는 것</h2>
          <p className="text-sm text-amber-100/50 max-w-xl mx-auto">
            수천 년 검증된 동양 철학의 통찰을 현대 기업 문화에 접목합니다
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {VALUE_PROPS.map((vp) => (
            <div
              key={vp.title}
              className="p-7 rounded-2xl border border-amber-900/30 bg-amber-950/20 hover:border-amber-700/50 transition-colors group"
            >
              <div className="text-3xl mb-4">{vp.icon}</div>
              <h3 className="font-serif text-amber-200 text-lg mb-3 group-hover:text-amber-100 transition-colors">
                {vp.title}
              </h3>
              <p className="text-sm text-amber-100/50 leading-relaxed">{vp.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="bg-amber-950/10 border-y border-amber-900/20 py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-serif text-amber-100 mb-3">도입 프로세스</h2>
            <p className="text-sm text-amber-100/50">계약부터 운영까지 모든 과정을 지원합니다</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            {[
              { step: '01', title: '문의 접수', desc: '폼 제출 후 영업일 1일 내 담당자 연락' },
              { step: '02', title: '맞춤 제안', desc: '기업 규모·목적에 맞는 플랜 제안 및 시연' },
              { step: '03', title: '계약 체결', desc: 'NDA·DPA 포함 기업 계약 체결' },
              { step: '04', title: '서비스 시작', desc: '직원 온보딩 가이드 제공 및 즉시 이용 가능' },
            ].map((item, i) => (
              <div key={item.step} className="relative text-center">
                {i < 3 && (
                  <div className="hidden sm:block absolute top-6 left-full w-full h-px bg-gradient-to-r from-amber-700/40 to-transparent -translate-y-1/2 z-0" />
                )}
                <div className="relative z-10 w-12 h-12 mx-auto mb-4 rounded-full bg-amber-900/40 border border-amber-700/50 flex items-center justify-center">
                  <span className="text-xs font-mono text-amber-400">{item.step}</span>
                </div>
                <h4 className="font-serif text-amber-200 text-sm mb-2">{item.title}</h4>
                <p className="text-xs text-amber-100/40 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="max-w-5xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <h2 className="text-2xl sm:text-3xl font-serif text-amber-100 mb-3">기업 요금제</h2>
          <p className="text-sm text-amber-100/50 max-w-xl mx-auto">
            기업 규모에 맞는 플랜을 선택하세요. 모든 플랜은 1개월 무료 체험을 제공합니다.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl p-7 border flex flex-col ${
                tier.highlight
                  ? 'border-amber-600/60 bg-gradient-to-b from-amber-900/30 to-amber-950/20 shadow-lg shadow-amber-900/20'
                  : 'border-amber-900/30 bg-amber-950/10'
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 bg-amber-600 text-amber-100 text-[10px] font-semibold rounded-full tracking-wide">
                    가장 인기
                  </span>
                </div>
              )}
              <div className="mb-6">
                <h3 className="font-serif text-amber-200 text-xl mb-1">{tier.name}</h3>
                <p className="text-xs text-amber-100/40">{tier.subtitle}</p>
              </div>
              <div className="mb-6">
                <div className="text-2xl font-serif text-amber-300 font-semibold">{tier.price}</div>
                <div className="text-xs text-amber-100/30 mt-0.5">{tier.priceNote}</div>
              </div>
              <ul className="space-y-2.5 mb-8 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-xs text-amber-100/60">
                    <span className="text-amber-500 mt-0.5 shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="#contact"
                className={`block text-center py-3 rounded-xl text-xs font-medium transition-colors ${
                  tier.highlight
                    ? 'bg-amber-700 hover:bg-amber-600 text-amber-100'
                    : 'border border-amber-700/50 hover:border-amber-600 text-amber-400 hover:text-amber-300'
                }`}
              >
                {tier.cta}
              </a>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-amber-100/30 mt-6">
          * 모든 플랜 1개월 무료 체험 제공 · 연 계약 시 2개월 할인
        </p>
      </section>

      {/* ── Testimonials ── */}
      <section className="bg-amber-950/10 border-y border-amber-900/20 py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-serif text-amber-100 mb-3">도입 기업 후기</h2>
            <p className="text-sm text-amber-100/50">실제 도입 기업 담당자들의 이야기입니다</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.author} className="p-7 rounded-2xl border border-amber-900/30 bg-black/30">
                <div className="text-amber-600 text-2xl mb-4 font-serif leading-none">&ldquo;</div>
                <p className="text-sm text-amber-100/60 leading-relaxed mb-6">{t.quote}</p>
                <div>
                  <div className="text-sm text-amber-300 font-medium">{t.author}</div>
                  <div className="text-xs text-amber-100/30 mt-0.5">{t.company}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="max-w-3xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <h2 className="text-2xl sm:text-3xl font-serif text-amber-100 mb-3">자주 묻는 질문</h2>
        </div>
        <div>
          {FAQ_ITEMS.map((item) => (
            <FaqItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </section>

      {/* ── Contact Form ── */}
      <section id="contact" className="bg-amber-950/10 border-t border-amber-900/20 py-24">
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-serif text-amber-100 mb-3">도입 문의하기</h2>
            <p className="text-sm text-amber-100/50 max-w-md mx-auto">
              양식을 작성해주시면 영업일 1~2일 내 전담 컨설턴트가 연락드립니다. 첫 상담은 무료입니다.
            </p>
          </div>
          <div className="p-8 rounded-2xl border border-amber-900/30 bg-black/30">
            <ContactForm />
          </div>
          <p className="text-center text-xs text-amber-100/30 mt-6">직접 문의: 010-2311-2010 · 평일 10:00–18:00</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-amber-900/20 py-10">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-amber-400">해화당 (海華堂)</span>
            <span className="text-xs text-amber-100/30">기업 솔루션</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-amber-100/30">
            <Link href="/terms" className="hover:text-amber-400 transition-colors">
              이용약관
            </Link>
            <Link href="/privacy" className="hover:text-amber-400 transition-colors">
              개인정보처리방침
            </Link>
            <Link href="/" className="hover:text-amber-400 transition-colors">
              개인 서비스
            </Link>
          </div>
          <p className="text-xs text-amber-100/20">© 2026 큐브시스템. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
