'use client'

import Link from 'next/link'
import { Plus, Users } from 'lucide-react'
import type { DestinyTarget } from '@/app/actions/user/destiny'

/**
 * 종합사주풀이 — 「누구의 풀이인가」 대상 선택 줄.
 *
 * 2026-08-24 CEO: «종합운세 페이지에 가족 선택하는 게 없어. 만들어주고, 각 가족 해당 인원을
 * 선택했을 때도 지금처럼 채워야 할 복주머니를 표시해줘.» — 화면은 원래 `?target=` 을 읽고
 * 있었지만 **바꿀 수단이 없어** 사실상 본인 전용이었다.
 *
 * 🔴 여기서 서버를 부르지 않는다. 목록도 요건도 페이지가 지고, 이 컴포넌트는 받아서 그리기만
 *    한다(자가 조회 배너 패턴을 여기 들이면 대상이 바뀔 때마다 두 곳이 따로 흔들린다).
 * 🔴 id 는 `v_destiny_targets` 의 id 그대로다 — 본인/가족 변환은 `samhap-target.ts` 가 진다.
 */
interface SamhapTargetPickerProps {
  /** null = 아직 불러오는 중. 뼈대만 그린다(자리가 튀지 않도록 높이를 유지). */
  targets: DestinyTarget[] | null
  selectedId: string | null
  onSelect: (id: string) => void
}

const HEADING_ID = 'samhap-target-heading'

export function SamhapTargetPicker({ targets, selectedId, onSelect }: SamhapTargetPickerProps) {
  return (
    <section aria-labelledby={HEADING_ID} className="space-y-2.5">
      <div className="flex items-center justify-between px-0.5">
        <h2 id={HEADING_ID} className="text-xs font-serif font-medium tracking-widest text-gold-500/70">
          누구의 종합풀이인가요
        </h2>
        <Link
          href="/protected/family"
          className="text-[11px] font-sans text-white/35 transition-colors hover:text-gold-500"
        >
          가족 관리
        </Link>
      </div>

      {targets === null ? (
        <div className="flex gap-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[46px] w-28 shrink-0 animate-pulse rounded-full border border-white/5 bg-white/[0.03]"
            />
          ))}
        </div>
      ) : targets.length === 0 ? (
        <Link
          href="/protected/family"
          className="flex items-center gap-3 rounded-2xl border border-dashed border-gold-500/25 bg-white/[0.02] p-4 transition-colors hover:border-gold-500/50"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/40">
            <Users className="h-4 w-4" strokeWidth={1.5} />
          </span>
          <span className="text-xs font-sans font-light leading-relaxed text-white/50">
            등록된 대상이 없습니다. 가족 관리에서 먼저 추가해 주세요.
          </span>
        </Link>
      ) : (
        // 가로 스크롤 한 줄 — 대상이 늘어도 세로를 먹지 않는다(요건 표가 첫 화면에서 밀리지 않게).
        <div role="radiogroup" aria-label="분석 대상" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {targets.map((target) => {
            const selected = target.id === selectedId
            return (
              <button
                key={target.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onSelect(target.id)}
                className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-500/60 ${
                  selected
                    ? 'border-gold-500/60 bg-gold-500/10'
                    : 'border-white/10 bg-white/[0.02] hover:border-white/25'
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-serif text-xs font-bold ${
                    selected
                      ? 'border-gold-500/40 bg-gold-500/20 text-gold-500'
                      : 'border-white/10 bg-white/5 text-ink-light/50'
                  }`}
                >
                  {target.name.slice(0, 1)}
                </span>
                <span className="flex flex-col items-start leading-tight">
                  <span className={`text-[13px] font-sans ${selected ? 'text-ink-light' : 'text-ink-light/60'}`}>
                    {target.name}
                  </span>
                  <span className="text-[10px] font-sans font-light text-ink-light/35">{target.relation_type}</span>
                </span>
              </button>
            )
          })}

          <Link
            href="/protected/family"
            aria-label="가족 추가"
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-white/15 px-3 py-2 text-[12px] font-sans text-white/40 transition-colors hover:border-gold-500/40 hover:text-gold-500"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            추가
          </Link>
        </div>
      )}
    </section>
  )
}
