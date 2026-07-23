'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FileText, ChevronDown } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cleanAnalysisText } from '@/lib/domain/analysis/clean-analysis-text'

interface DetailAnalysisAccordionProps {
  /** AI 원문(태그·마크다운 포함) */
  raw?: string
  title?: string
}

/**
 * "전문 보기" 아코디언 — 구조화 카드가 본문이고, AI 원문은 접힌 상태로 강등.
 * cleanAnalysisText로 [[태그]] 제거 + 마크다운→안전 HTML 변환 후 렌더.
 * (입력 HTML은 이스케이프되므로 dangerouslySetInnerHTML 안전)
 */
export function DetailAnalysisAccordion({ raw, title = '상세 분석 · 전문 보기' }: DetailAnalysisAccordionProps) {
  const [open, setOpen] = useState(false)
  const html = useMemo(() => cleanAnalysisText(raw ?? ''), [raw])

  if (!html) return null

  return (
    <Card className="card-glass-manse border-white/5 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-5 text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gold-500/70" />
          <h3 className="text-sm font-serif font-bold text-gold-500/90">{title}</h3>
        </div>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-white/40" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden border-t border-white/5"
          >
            <div
              className="analysis-prose px-5 py-4 text-sm text-white/60 font-sans font-light leading-loose"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .analysis-prose :global(h4) {
          color: var(--gold-300, #f4e4ba);
          font-family: var(--font-serif, serif);
          font-weight: 700;
          font-size: 0.9rem;
          margin: 1rem 0 0.4rem;
        }
        .analysis-prose :global(h4:first-child) {
          margin-top: 0;
        }
        .analysis-prose :global(b) {
          color: rgba(232, 228, 220, 0.92);
          font-weight: 600;
        }
        .analysis-prose :global(ul) {
          margin: 0.4rem 0;
          padding-left: 1rem;
          list-style: none;
        }
        .analysis-prose :global(li) {
          position: relative;
          padding-left: 0.9rem;
          margin: 0.25rem 0;
        }
        .analysis-prose :global(li)::before {
          content: '·';
          position: absolute;
          left: 0;
          color: rgba(201, 168, 76, 0.6);
        }
      `}</style>
    </Card>
  )
}
