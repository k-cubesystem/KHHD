'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { X, Coins, Sparkles, Gift } from 'lucide-react'

interface EventPopupProps {
  onClose: () => void
}

export function EventPopup({ onClose }: EventPopupProps) {
  // ESC 키로 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-5" onClick={onClose}>
      {/* 배경 오버레이 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
      />

      {/* 팝업 본체 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: 'spring', damping: 20, stiffness: 260 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm overflow-hidden rounded-3xl"
        style={{
          background: 'linear-gradient(160deg, #0D0900 0%, #1A1000 40%, #0A0A18 100%)',
          boxShadow: '0 0 60px rgba(212,175,55,0.2), 0 0 0 1px rgba(212,175,55,0.15)',
        }}
      >
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <X className="w-3.5 h-3.5 text-white/50" />
        </button>

        {/* 상단 골드 라인 */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[#D4AF37]/60 to-transparent" />

        {/* 배경 글로우 */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(212,175,55,0.18),transparent_60%)] pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#D4AF37]/8 blur-[60px] rounded-full pointer-events-none" />

        {/* 콘텐츠 */}
        <div className="relative px-7 pt-10 pb-8 text-center">
          {/* 이벤트 배지 */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/8 mb-5"
          >
            <Sparkles className="w-3 h-3 text-[#D4AF37]" />
            <span className="text-[10px] text-[#D4AF37]/80 font-medium tracking-[0.2em] uppercase">
              신규 회원 이벤트
            </span>
          </motion.div>

          {/* 선물 아이콘 */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2, damping: 12 }}
            className="mx-auto w-20 h-20 rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/8 flex items-center justify-center mb-5"
          >
            <Gift className="w-9 h-9 text-[#D4AF37]" strokeWidth={1.3} />
          </motion.div>

          {/* 메인 카피 */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
            <p className="text-xs text-white/40 font-sans mb-2 tracking-wide">지금 가입하면</p>
            <h2
              className="font-serif text-3xl font-bold mb-1"
              style={{
                background: 'linear-gradient(180deg, #F4E4BA 0%, #D4AF37 60%, #A07828 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              50만냥 즉시 지급
            </h2>
            <div className="flex items-center justify-center gap-1.5 mt-1 mb-5">
              <Coins className="w-3.5 h-3.5 text-[#D4AF37]/60" />
              <p className="text-xs text-white/35 font-sans">회원가입 완료 즉시 복채 50만냥 증정</p>
            </div>

            {/* 혜택 리스트 */}
            <div className="bg-white/3 border border-white/6 rounded-2xl p-4 mb-6 text-left space-y-2.5">
              {[
                { icon: '👁', text: '관상·손금·풍수 분석 25회 가능' },
                { icon: '🔮', text: '사주·운세 분석 10회 가능' },
                { icon: '💫', text: '첫 달 무료 체험 혜택 포함' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="text-base leading-none mt-0.5">{item.icon}</span>
                  <span className="text-xs text-white/55 font-sans font-light leading-relaxed">{item.text}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* CTA 버튼 */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38 }}
            className="space-y-2.5"
          >
            <Link
              href="/auth/sign-up"
              onClick={onClose}
              className="block w-full py-4 rounded-2xl font-serif font-bold text-base text-[#0A192F] transition-all duration-300 hover:opacity-90 active:scale-[0.98] relative overflow-hidden group"
              style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #F4E4BA 50%, #C9A227 100%)' }}
            >
              <div className="absolute inset-0 bg-white/15 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <span className="relative flex items-center justify-center gap-2">
                <Gift className="w-4 h-4" />
                지금 바로 가입하기
              </span>
            </Link>

            <button
              onClick={onClose}
              className="block w-full py-2.5 text-xs text-white/25 font-sans hover:text-white/40 transition-colors"
            >
              나중에 할게요
            </button>
          </motion.div>
        </div>

        {/* 하단 골드 라인 */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />
      </motion.div>
    </div>
  )
}

// 로그인 상태 체크 포함한 팝업 래퍼
export function EventPopupWrapper() {
  const [show, setShow] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    // 이미 닫은 적 있으면 세션 동안 다시 안 뜸
    const dismissed = sessionStorage.getItem('event_popup_dismissed')
    if (dismissed) {
      setChecked(true)
      return
    }

    // 로그인 상태 체크
    const checkAuth = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          // 약간의 딜레이 후 팝업 표시 (캐러셀 로딩 후)
          setTimeout(() => setShow(true), 1200)
        }
      } catch {
        // 에러 시 팝업 표시 안 함
      } finally {
        setChecked(true)
      }
    }

    checkAuth()
  }, [])

  const handleClose = () => {
    setShow(false)
    sessionStorage.setItem('event_popup_dismissed', '1')
  }

  if (!checked) return null

  return <AnimatePresence>{show && <EventPopup onClose={handleClose} />}</AnimatePresence>
}
