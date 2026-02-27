'use client'

import { User, Compass, Fingerprint, ArrowRight, Coins } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getWalletBalance } from '@/app/actions/payment/wallet'
import { motion } from 'framer-motion'

const SERVICES = [
  {
    id: 'palm',
    href: '/protected/studio/palm',
    label: '손금',
    eng: 'Palmistry',
    badge: 'Secret 01',
    icon: Fingerprint,
    cost: 2,
    desc: '내 손안에 쥐고 있던 재물과 생명의 지도를 읽어드립니다. 놓치고 있던 타고난 재능을 발견하세요.',
    tags: ['재물운', '생명선', '숨겨진재능'],
    gradient: 'from-emerald-950/40 to-transparent',
    accent: 'rgba(74,222,128,0.06)',
  },
  {
    id: 'face',
    href: '/protected/studio/face',
    label: '관상',
    eng: 'Physiognomy',
    badge: 'Secret 02',
    icon: User,
    cost: 2,
    desc: '성공하는 사람들의 얼굴에는 공통점이 있습니다. 당신의 부와 명예를 부르는 징조를 찾아보세요.',
    tags: ['성공운', '인복', '리더십'],
    gradient: 'from-amber-950/40 to-transparent',
    accent: 'rgba(251,191,36,0.06)',
  },
  {
    id: 'fengshui',
    href: '/protected/studio/fengshui',
    label: '공간풍수',
    eng: 'Feng Shui',
    badge: 'Secret 03',
    icon: Compass,
    cost: 2,
    desc: '머무는 곳이 당신의 기운을 결정합니다. 나쁜 기운은 막고 좋은 기운을 부르는 공간의 비밀.',
    tags: ['가구배치', '양택풍수', '기운전환'],
    gradient: 'from-blue-950/40 to-transparent',
    accent: 'rgba(96,165,250,0.06)',
  },
]

export default function StudioPage() {
  const [balance, setBalance] = useState<number | null>(null)

  useEffect(() => {
    getWalletBalance().then(setBalance)
  }, [])

  return (
    <div className="min-h-screen bg-background text-ink-light font-sans relative pb-24 overflow-x-hidden">
      {/* 배경 그라데이션 */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-64 bg-[#D4AF37]/5 blur-[80px] rounded-full" />
      </div>

      <header className="px-5 pt-14 pb-8 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-5"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#D4AF37]/8 border border-[#D4AF37]/15 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
            <span className="text-[10px] text-[#D4AF37]/80 font-medium tracking-[0.2em] uppercase">
              Secret of Fortune
            </span>
          </div>

          <div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-ink-light leading-snug mb-3">
              왜 그 사람은 항상 <br />
              <span
                className="relative inline-block"
                style={{
                  background: 'linear-gradient(135deg, #F4E4BA 0%, #D4AF37 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                운이 좋을까요?
              </span>
            </h1>
            <p className="text-sm text-white/40 font-light leading-relaxed max-w-xs mx-auto">
              성공한 상위 1%가 남몰래 챙기는 3가지 비밀,
              <br />
              이제 당신의 것으로 만드세요.
            </p>
          </div>

          {/* 복채 잔액 표시 */}
          {balance !== null && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#D4AF37]/8 border border-[#D4AF37]/15 rounded-xl"
            >
              <Coins className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="text-xs text-white/40 font-sans">보유 복채</span>
              <span className="text-sm font-bold text-[#D4AF37] font-serif">{balance}만냥</span>
            </motion.div>
          )}
        </motion.div>
      </header>

      <main className="px-5 relative z-10 space-y-3 pb-20">
        {SERVICES.map((service, i) => (
          <motion.div
            key={service.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.1, duration: 0.5 }}
          >
            <Link href={service.href} className="block group">
              <div
                className="relative overflow-hidden rounded-2xl border border-white/5 p-5 transition-all duration-300 hover:border-[#D4AF37]/25 hover:shadow-[0_0_24px_rgba(212,175,55,0.08)]"
                style={{
                  background: `radial-gradient(ellipse_at_top_left, ${service.accent}, transparent 60%), rgba(255,255,255,0.02)`,
                }}
              >
                {/* 상단 줄 */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/8 border border-[#D4AF37]/10 flex items-center justify-center shrink-0 group-hover:bg-[#D4AF37]/15 transition-colors">
                      <service.icon className="w-5 h-5 text-[#D4AF37]" strokeWidth={1.5} />
                    </div>
                    <span className="text-[9px] font-bold text-[#D4AF37]/40 tracking-[0.25em] uppercase">
                      {service.badge}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* 비용 뱃지 */}
                    <div className="flex items-center gap-1 bg-[#D4AF37]/8 border border-[#D4AF37]/15 rounded-full px-2.5 py-1">
                      <Coins className="w-3 h-3 text-[#D4AF37]/70" />
                      <span className="text-[10px] text-[#D4AF37]/70 font-bold">{service.cost}만냥</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-white/15 group-hover:text-[#D4AF37] group-hover:translate-x-1 transition-all duration-300" />
                  </div>
                </div>

                {/* 타이틀 */}
                <h3 className="text-lg font-serif font-bold text-white/85 mb-1.5 group-hover:text-[#D4AF37] transition-colors duration-300">
                  {service.label}
                  <span className="text-sm font-sans font-normal text-white/25 ml-2">{service.eng}</span>
                </h3>

                {/* 설명 */}
                <p className="text-xs text-white/45 font-light leading-relaxed mb-3">{service.desc}</p>

                {/* 태그 */}
                <div className="flex gap-1.5 flex-wrap">
                  {service.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[9px] text-[#D4AF37]/50 font-medium bg-[#D4AF37]/5 border border-[#D4AF37]/10 px-2 py-0.5 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                {/* 호버 효과 - 하단 라인 */}
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/0 to-transparent group-hover:via-[#D4AF37]/30 transition-all duration-500" />
              </div>
            </Link>
          </motion.div>
        ))}

        {/* 하단 안내 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-2 p-4 rounded-xl border border-white/5 bg-white/2"
        >
          <p className="text-[10px] text-white/25 text-center font-light leading-relaxed">
            각 분석은 AI 기반으로 참고용으로만 활용하세요.
            <br />
            분석 결과는 저장되어 운세 기록에 반영됩니다.
          </p>
        </motion.div>
      </main>
    </div>
  )
}
