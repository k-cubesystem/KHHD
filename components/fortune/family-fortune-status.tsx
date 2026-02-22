'use client'

import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import type { FamilyMemberFortune } from '@/app/actions/fortune/fortune'

interface FamilyFortuneStatusProps {
  members: FamilyMemberFortune[]
}

export function FamilyFortuneStatus({ members }: FamilyFortuneStatusProps) {
  const memberCount = members.length
  // 최대 4명까지 이름 표시
  const displayMembers = members.filter((m) => m?.memberName).slice(0, 4)
  const remaining = memberCount > 4 ? memberCount - 4 : 0

  return (
    <Link href="/protected/family" className="block group">
      {/* 금빛 테두리 외곽 프레임 */}
      <div
        className="relative p-[1px] rounded-2xl transition-all duration-300"
        style={{
          background: 'linear-gradient(135deg, rgba(212,175,55,0.25) 0%, rgba(255,255,255,0.05) 50%, rgba(212,175,55,0.1) 100%)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}
      >
        {/* 내부 카드 */}
        <div
          className="relative overflow-hidden rounded-[calc(1rem-1.5px)]"
          style={{
            background: 'linear-gradient(160deg, #0f0c08 0%, #17130d 55%, #0a0807 100%)',
          }}
        >
          {/* 앰비언트 글로우 우상단 */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: '-20%',
              right: '-10%',
              width: '200px',
              height: '200px',
              background: 'radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 65%)',
              filter: 'blur(35px)',
            }}
          />
          {/* 앰비언트 글로우 좌하단 */}
          <div
            className="absolute pointer-events-none"
            style={{
              bottom: '-20%',
              left: '-10%',
              width: '160px',
              height: '160px',
              background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 65%)',
              filter: 'blur(30px)',
            }}
          />

          <div className="relative z-10 px-5 py-5 flex flex-col gap-4">
            {/* ── 상단: 타이틀 + 운 상태 ── */}
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <h3
                  className="text-[1.3rem] font-serif font-medium leading-[1.3] text-white"
                  style={{ wordBreak: 'keep-all' }}
                >
                  당신은 가족의{' '}
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
                  className="text-[13px] font-light"
                  style={{ color: 'rgba(255,255,255,0.45)', wordBreak: 'keep-all' }}
                >
                  소중한 인연들의 운을 함께 챙겨주세요
                </p>
              </div>

              {/* 운 상태 태그 */}
              <motion.div
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
                style={{
                  background: 'rgba(212,175,55,0.1)',
                  border: '1px solid rgba(212,175,55,0.3)',
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: '#D4AF37', boxShadow: '0 0 6px rgba(212,175,55,0.8)' }}
                />
                <span
                  className="text-[11.5px] font-medium tracking-wide"
                  style={{ color: '#F4E4BA' }}
                >
                  운이 들어오는 중
                </span>
              </motion.div>
            </div>

            {/* ── 구분선 ── */}
            <div
              className="h-px"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(212,175,55,0.3), transparent)',
              }}
            />

            {/* ── 가족 이름 목록 ── */}
            {memberCount > 0 ? (
              <div className="flex flex-wrap gap-2">
                {displayMembers.map((member, i) => (
                  <motion.div
                    key={member.memberId ?? i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.08, duration: 0.4 }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(212,175,55,0.2)',
                    }}
                  >
                    {/* 이니셜 원 */}
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-serif font-bold flex-shrink-0"
                      style={{
                        background: 'linear-gradient(135deg, #D4AF37, #8C6A20)',
                        color: '#0a0807',
                      }}
                    >
                      {member.memberName?.slice(0, 1) ?? '?'}
                    </div>
                    <span
                      className="text-[14px] font-serif font-medium"
                      style={{ color: 'rgba(244,228,186,0.85)' }}
                    >
                      {member.memberName}
                    </span>
                  </motion.div>
                ))}
                {remaining > 0 && (
                  <div
                    className="flex items-center px-3 py-1.5 rounded-full text-[13px]"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px dashed rgba(212,175,55,0.2)',
                      color: 'rgba(212,175,55,0.5)',
                    }}
                  >
                    +{remaining}명
                  </div>
                )}
              </div>
            ) : (
              <p
                className="text-[12px] font-light italic"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                아직 등록된 인연이 없습니다
              </p>
            )}

            {/* ── 명언 ── */}
            <p className="text-[12.5px] italic font-serif" style={{ color: 'rgba(212,175,55,0.4)' }}>
              &ldquo;가족의 운이 모이면 집안의 기운이 완성됩니다&rdquo;
            </p>

            {/* ── 구분선 ── */}
            <div
              className="h-px"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(212,175,55,0.2), transparent)',
              }}
            />

            {/* ── 하단: 관리하러 가기 ── */}
            <div className="flex items-center justify-end">
              <div
                className="flex items-center gap-1 text-[13.5px] font-medium group-hover:gap-1.5 transition-all duration-300"
                style={{ color: 'rgba(212,175,55,0.7)' }}
              >
                <span>가족 운 관리하러 가기</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
