'use client'

import { useMemo, type CSSProperties } from 'react'
import { toast } from 'sonner'
import { buildPrayerFrames, type FamilyPrayer } from '@/lib/domain/shrine/family-prayer'
import type { FamilyShelfUnit } from '@/lib/domain/shrine/family-shelf'

/**
 * 기도 액자(祈禱 額子) — 가족 선반장 **위쪽 벽**에 걸리는 기도문 (백일기도 v2 · CEO 2026-08-25).
 *
 * «어디에 무엇을 거는가»는 전부 도메인(buildPrayerFrames)이 판정하고, 여기는 상자를 받아
 * 그리기만 한다. 자산 0 — 나무틀·한지 전부 CSS 다(액자 그림을 굽는 것은 다음 회차의 선택지).
 *
 * 연출 규율: transform/opacity 만. 새 keyframes 를 만들지 않는다(styled-jsx·CSS 게이트 전례).
 * 액자는 탭하면 전문(全文)을 토스트로 보여준다 — 좁은 액자에서 말줄임된 기도의 구제책.
 */

type FrameVars = CSSProperties & Record<`--${string}`, string>

export function PrayerBoard({
  prayers,
  units,
}: {
  prayers: readonly FamilyPrayer[]
  units: readonly FamilyShelfUnit[]
}) {
  const frames = useMemo(() => buildPrayerFrames(prayers, units), [prayers, units])
  if (frames.length === 0) return null

  return (
    <>
      {frames.map((f) => {
        const wrap: FrameVars = {
          left: `${f.x - f.w / 2}%`,
          top: `${f.top}%`,
          width: `${f.w}%`,
          height: `${f.h}%`,
          // 선반장(z 9)과 같은 벽 살림 대역 — 아이템 대역(10~29) 아래라 진열물이 앞에 선다
          zIndex: 9,
          transform: `rotate(${f.tilt}deg)`,
        }
        return (
          <button
            key={f.key}
            type="button"
            aria-label={`${f.name} 기도 액자 — ${f.text}`}
            onClick={() => toast(`「${f.text}」`, { description: `기도 대상 · ${f.name} 🙏` })}
            className="absolute select-none text-left"
            style={wrap}
          >
            {/* 걸이못 — 액자가 벽에 «걸려» 있음을 말하는 한 점 */}
            <span
              aria-hidden
              className="absolute left-1/2 top-[-4%] h-[5px] w-[5px] -translate-x-1/2 rounded-full"
              style={{ background: 'radial-gradient(circle at 35% 35%, #d8c08a, #6e5320 70%)' }}
            />
            {/* 나무틀 */}
            <span
              aria-hidden
              className="absolute inset-0 rounded-[3px]"
              style={{
                background: 'linear-gradient(160deg, #5a4326 0%, #3b2c18 55%, #2a1e10 100%)',
                boxShadow: '0 2px 5px rgba(0,0,0,0.55), inset 0 1px 0 rgba(216,192,138,0.25)',
              }}
            />
            {/* 한지 면 + 기도문 */}
            <span
              className="absolute inset-[7%] flex flex-col items-center justify-center gap-[6%] overflow-hidden rounded-[2px] px-[7%] py-[5%] text-center"
              style={{
                background: 'linear-gradient(175deg, #efe4c9 0%, #e4d5b2 100%)',
                boxShadow: 'inset 0 0 6px rgba(90,67,38,0.35)',
              }}
            >
              <span
                className="line-clamp-3 w-full font-serif font-bold leading-[1.45] text-[#3b2c18]"
                style={{ fontSize: 'clamp(8px, 0.72em, 11px)', wordBreak: 'keep-all' }}
              >
                {f.text}
              </span>
              <span className="w-full truncate font-sans font-medium text-[#7a5c30]" style={{ fontSize: '8px' }}>
                — {f.name}
              </span>
            </span>
          </button>
        )
      })}
    </>
  )
}
