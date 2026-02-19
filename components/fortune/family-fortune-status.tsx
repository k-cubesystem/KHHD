'use client'

import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import type { FamilyMemberFortune } from '@/app/actions/fortune/fortune'

interface FamilyFortuneStatusProps {
  members: FamilyMemberFortune[]
}

export function FamilyFortuneStatus({ members }: FamilyFortuneStatusProps) {
  const totalFortune = members.reduce((sum, m) => sum + m.fortune, 0)
  const maxPossible = members.length * 800
  const percentage = maxPossible > 0 ? Math.round((totalFortune / maxPossible) * 100) : 0
  const memberCount = members.length

  return (
    <Link href="/protected/family" className="block group">
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, #0e0b07 0%, #16120a 60%, #0a0807 100%)',
          border: '1px solid rgba(212,175,55,0.18)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(212,175,55,0.06)',
        }}
      >
        {/* 앰비언트 글로우 */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '-30%',
            right: '-15%',
            width: '220px',
            height: '220px',
            background: 'radial-gradient(circle, rgba(212,175,55,0.12) 0%, transparent 65%)',
            filter: 'blur(40px)',
          }}
        />

        {/* 한지 노이즈 */}
        <div
          className="absolute inset-0 pointer-events-none mix-blend-overlay"
          style={{
            opacity: 0.03,
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '200px 200px',
          }}
        />

        <div className="relative z-10 px-6 py-6 flex flex-col gap-4">
          {/* 헤드라인 — 가로 배치 */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <h3
                className="text-[1.25rem] font-serif font-medium leading-[1.3] text-white"
                style={{ wordBreak: 'keep-all' }}
              >
                당신은{' '}
                <span
                  style={{
                    background: 'linear-gradient(90deg, #F4E4BA, #D4AF37)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  가족
                </span>
                의{' '}
                <span
                  style={{
                    background: 'linear-gradient(90deg, #F4E4BA, #D4AF37)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  수호신
                </span>
              </h3>
              <p
                className="text-[12px] font-light leading-relaxed"
                style={{ color: 'rgba(255,255,255,0.5)', wordBreak: 'keep-all' }}
              >
                소중한 <span style={{ color: 'rgba(244,228,186,0.65)' }}>인연</span> {memberCount}
                명의 운명을 곁에서 지켜주세요.
              </p>
            </div>

            {/* 진행률 숫자 — 우측 */}
            <div className="flex-shrink-0 flex flex-col items-end gap-0.5">
              <span
                className="text-2xl font-serif font-bold leading-none"
                style={{
                  background: 'linear-gradient(135deg, #F4E4BA, #D4AF37)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {percentage}%
              </span>
              <span className="text-[10px]" style={{ color: 'rgba(212,175,55,0.55)' }}>
                가족 운 보호 중
              </span>
            </div>
          </div>

          {/* 진행 바 */}
          <div
            className="w-full h-1.5 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.07)' }}
          >
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              style={{ background: 'linear-gradient(90deg, #B8860B, #D4AF37, #F4E4BA)' }}
            />
          </div>

          {/* 구분선 */}
          <div
            className="h-px w-full"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.25), transparent)',
            }}
          />

          {/* 하단 — 관리하러 가기 */}
          <div className="flex items-center justify-between">
            <p
              className="text-[11.5px] italic font-serif"
              style={{ color: 'rgba(212,175,55,0.45)' }}
            >
              &ldquo;가족의 운이 모이면 집안의 기운이 완성됩니다&rdquo;
            </p>
            <div
              className="flex items-center gap-0.5 text-[11px] font-medium group-hover:gap-1 transition-all duration-300"
              style={{ color: 'rgba(212,175,55,0.7)' }}
            >
              <span>관리하러 가기</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
