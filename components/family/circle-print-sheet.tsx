'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { ChevronLeft, Printer } from 'lucide-react'
import { EL_KO, EL_LABEL } from '@/lib/domain/shrine/energy'
import type { Element } from '@/lib/domain/shrine/types'
import { CIRCLE_KIND_META } from '@/lib/domain/circle/circle'
import { ELEMENT_LORE, HANJA_OF } from '@/lib/domain/circle/element-lore'
import { REMEDY_TABLE } from '@/lib/domain/remedy/remedy'
import type { CircleEnergyPayload } from '@/app/actions/circle/energy'
import { trackEvent } from '@/lib/analytics/ga4'

/**
 * 「우리 팀 기운 한 장」 — 무리 전원의 «모자란 기운 · 책상 위 한 가지 · 집 안 · 선물 셋 · 앉는 방향» 표(A4).
 * BUSINESS 전용(PRD-energy-circle §3-5 인쇄 층). 팀장이 뽑아서 책상마다 놓는 실물 행동을 앱이 문서로 만든다.
 *
 * 종이는 밝다 — 앱은 먹빛이지만 이 화면은 인쇄물이라 종이색으로 그린다(의도적 단일 테마).
 * 🔴 점수·순위 없음. 직장 무리는 고지가 종이에도 찍힌다.
 */

function label(el: Element): string {
  return `${EL_LABEL[el]}(${EL_KO[el]})`
}

export function CirclePrintSheet({ payload, printedAt }: { payload: CircleEnergyPayload; printedAt: string }) {
  const { circle, energy } = payload
  const meta = CIRCLE_KIND_META[circle.kind]
  const viewed = useRef(false)

  useEffect(() => {
    if (viewed.current) return
    viewed.current = true
    trackEvent({ action: 'team_sheet_view', category: 'engagement', label: circle.kind, value: energy.entries.length })
  }, [circle.kind, energy.entries.length])

  const print = () => {
    trackEvent({ action: 'team_sheet_print', category: 'conversion', label: circle.kind })
    window.print()
  }

  return (
    <div className="min-h-screen w-full max-w-[720px] mx-auto px-3 py-6 pb-28">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 14mm; }
          body * { visibility: hidden; }
          .team-sheet, .team-sheet * { visibility: visible; }
          .team-sheet { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: 0 !important; }
        }
      `}</style>

      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link
          href={circle.id === 'family' ? '/protected/family/map' : `/protected/family/map?circle=${circle.id}`}
          className="inline-flex items-center gap-1 font-serif text-[12px] text-ink-light/50 hover:text-gold-300"
        >
          <ChevronLeft className="h-4 w-4" />
          기운 지도
        </Link>
        <button
          type="button"
          onClick={print}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gold-500/45 bg-gold-500/[0.12] px-3.5 py-2 font-serif text-[12.5px] font-bold text-gold-200 hover:bg-gold-500/20"
        >
          <Printer className="h-3.5 w-3.5" /> 인쇄하기
        </button>
      </div>

      <article
        className="team-sheet rounded-md border border-[#D9D2C2] bg-[#FBF8F1] p-7 text-[#1E1A14] shadow-[0_20px_60px_-30px_rgba(0,0,0,0.6)]"
        style={{ fontFamily: 'var(--font-serif, "Noto Serif KR", serif)' }}
      >
        <header className="mb-5 border-b border-[#C9A84C] pb-4">
          <p className="text-[10px] tracking-[0.4em] text-[#8C7B50]">청담해화당 · 기운 처방전</p>
          <h1 className="mt-1 text-[24px] font-bold leading-tight">
            {circle.name} 기운 한 장{' '}
            <span className="align-middle rounded-full border border-[#C9A84C] px-2 py-[1px] text-[11px] font-normal text-[#6B5B2E]">
              {meta.label}
            </span>
          </h1>
          <p className="mt-1 text-[12px] text-[#6B6255]">
            {printedAt} · {energy.entries.length}명 · 함께 채울 기운{' '}
            <b className="text-[#1E1A14]">{label(energy.lowest)}</b>
            {energy.holders.length > 0 ? (
              <> — 든 사람 {energy.holders.map((h) => h.name).join(', ')}</>
            ) : (
              <> — 든 사람이 없어 물건으로 채웁니다 · {energy.fallbackItem}</>
            )}
          </p>
          {energy.notice && (
            <p className="mt-2 rounded border border-[#E1D6B8] bg-[#F3ECD8] px-3 py-2 text-[11px] leading-relaxed text-[#5C4F2A]">
              {energy.notice}
            </p>
          )}
        </header>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-[12px] leading-snug">
            <thead>
              <tr className="border-b-2 border-[#C9A84C] text-left text-[11px] tracking-[0.08em] text-[#6B5B2E]">
                <th className="py-2 pr-3 font-bold">이름</th>
                <th className="py-2 pr-3 font-bold">모자란 기운</th>
                <th className="py-2 pr-3 font-bold">책상 위 한 가지</th>
                <th className="py-2 pr-3 font-bold">집·자리</th>
                <th className="py-2 pr-3 font-bold">선물 셋</th>
                <th className="py-2 font-bold">앉는 방향</th>
              </tr>
            </thead>
            <tbody>
              {energy.entries.map((e) => {
                const lore = ELEMENT_LORE[e.yongsin]
                const hanja = HANJA_OF[e.yongsin]
                return (
                  <tr key={e.targetId} className="border-b border-[#E6DFCE] align-top">
                    <td className="whitespace-nowrap py-2.5 pr-3">
                      <b>{e.name}</b>
                      <span className="block text-[10.5px] text-[#8C8478]">{e.relation}</span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <b>{label(e.yongsin)}</b>
                      <span className="block text-[10.5px] text-[#6B6255]">{lore.gains}</span>
                    </td>
                    <td className="py-2.5 pr-3">{lore.deskItem}</td>
                    <td className="py-2.5 pr-3">{REMEDY_TABLE.SPACE[hanja]}</td>
                    <td className="py-2.5 pr-3">{lore.gifts.join(' · ')}</td>
                    <td className="whitespace-nowrap py-2.5">{REMEDY_TABLE.DIRECTION[hanja]}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {energy.roles && (
          <p className="mt-4 text-[11.5px] leading-relaxed text-[#4A4238]" style={{ wordBreak: 'keep-all' }}>
            <b className="text-[#6B5B2E]">역할 결 · </b>
            {energy.roles.sentence}
          </p>
        )}

        <footer className="mt-5 border-t border-[#E6DFCE] pt-3 text-[10px] leading-relaxed text-[#8C8478]">
          재미로 즐기는 전통 풀이입니다. 의학적·심리적·재무적 조언을 대신하지 않습니다. 이 표는 이미 함께 있는 사람을
          돌보기 위한 것이며 사람을 고르거나 재는 데 쓰지 않습니다. · k-haehwadang.com
        </footer>
      </article>
    </div>
  )
}
