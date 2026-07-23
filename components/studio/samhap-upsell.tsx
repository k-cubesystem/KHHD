'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Layers, ArrowRight } from 'lucide-react'
import { getSamhapReadiness } from '@/app/actions/ai/samhap'
import { trackEvent } from '@/lib/analytics/ga4'

/**
 * 삼합 업셀 배너 — 관상·손금 결과 하단. 요건(관상+손금+생년월일) 충족 시에만 표시.
 * 스스로 readiness 를 조회해 준비된 사용자에게만 노출한다.
 */
export function SamhapUpsellBanner({ targetId }: { targetId?: string }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    getSamhapReadiness(targetId).then((r) => {
      if (active && r.ready) {
        setReady(true)
        trackEvent({ action: 'samhap_upsell_view', category: 'analysis', label: 'samhap' })
      }
    })
    return () => {
      active = false
    }
  }, [targetId])

  if (!ready) return null

  const href = `/protected/studio/samhap${targetId ? `?target=${targetId}` : ''}`

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Link
        href={href}
        onClick={() => trackEvent({ action: 'samhap_upsell_click', category: 'analysis', label: 'samhap' })}
        className="block relative overflow-hidden rounded-2xl border border-gold-500/40 p-4 group"
        style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.12) 0%, rgba(158,43,43,0.07) 100%)' }}
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-500/60 to-transparent" />
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gold-500/15 border border-gold-500/30 shrink-0">
            <Layers className="w-5 h-5 text-gold-500" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-serif font-bold text-gold-500">관상·손금·사주가 모였습니다</p>
            <p className="text-[11px] text-white/60 font-sans font-light mt-0.5">
              삼합(三合)으로 세 기운을 종합해 보세요 · Premium
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-gold-500/70 group-hover:translate-x-1 transition-transform shrink-0" />
        </div>
      </Link>
    </motion.div>
  )
}
