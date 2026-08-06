'use client'

import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import { PLAQUE_SPRITE_URL, SHRINE_PLAQUES, type PlaqueSheet, type ShrinePlaque } from '@/lib/domain/shrine/plaque'
import { trackEvent } from '@/lib/analytics/ga4'

/**
 * 의식각(儀式閣) — 방 오른쪽 공간의 의식 진입 현판 4문 (2026-08-06 지시).
 *
 * 종전에는 창방 팻말(WindowPlaques)이 신위 **뒤** 벽 상단 띠에 걸렸다 — "신 뒤쪽에서 빼서
 * 오른쪽 공간에 다시 기획"의 반영이다. 사랑방(FamilyHall)이 물러난 world 우측 영역
 * (약 79~99%)에 현판을 2×2 로 건다: 엽전 → 액막이 → 오방기 → 백일기도 (의식의 호흡 순서,
 * SHRINE_PLAQUES 정의 그대로).
 *
 *  · 좌표는 **world %** — stageContent(대청=세계 전체) 안에 살아 카메라 팬을 함께 탄다.
 *  · 무라 픽셀 좌표(plaqueBandVars)를 쓰지 않는다 — 창틀 정합이 목적이던 종전과 달리
 *    여기는 빈 벽이라 방 % 로 충분하고, 기기 종횡비에도 세로가 흔들리지 않는다.
 *  · 처마 등(attention)·시트/페이지 갈래(kind)는 창방 팻말의 계약을 그대로 승계한다.
 */

const HALL_X0 = 79
const HALL_W = 19.75
/** 아이템 대역(10~29) 최상단 — 진입점이 신물에 가려지면 안 된다. UI(z 30) 아래. */
const HALL_Z = 29

/** 현판 두 열 × 두 행 (컨테이너 %) — 널 비율 5:2 는 스프라이트 몰딩·놋쇠 못의 계약이다 */
const COL_X = [5, 53] as const
const ROW_Y = [24, 37] as const
const PLAQUE_W = 42

type PlaqueStyle = CSSProperties

function plaqueStyle(): PlaqueStyle {
  return {
    width: `${PLAQUE_W}%`,
    aspectRatio: '5 / 2',
    // 널이 404 여도 글자는 남는다 — 어두운 나무 면을 색으로 깔아 둔다 (창방 팻말과 같은 방어)
    backgroundColor: 'rgba(38,26,14,0.92)',
    backgroundImage: `url('${PLAQUE_SPRITE_URL}')`,
    backgroundSize: '100% 100%',
    backgroundRepeat: 'no-repeat',
    filter: 'drop-shadow(0 4px 5px rgba(0,0,0,0.5))',
  }
}

function Face({ p, lit }: { p: ShrinePlaque; lit: boolean }): ReactNode {
  return (
    <>
      {lit && <span aria-hidden className="shrine-plaque-ember" style={{ width: 7, height: 7, top: 6, right: 8 }} />}
      <span aria-hidden className="font-serif text-[9px] tracking-[1px] text-gold-500/70">
        {p.hanja}
      </span>
      <span className="mt-[2px] font-serif text-[15px] font-bold text-[#F2DEA8]">{p.ko}</span>
    </>
  )
}

export function RitualHall({
  onOpenSheet,
  attention,
}: {
  /** 방 안 시트를 여는 손잡이 — 핸들러가 없으면 그 현판은 걸지 않는다(눌러도 조용한 널 금지) */
  onOpenSheet?: Partial<Record<PlaqueSheet, () => void>>
  /** 「오늘 할 일이 남았다」 처마 등 — 서버 현황에서만 계산된 값 */
  attention?: Partial<Record<string, boolean>>
}) {
  const track = (key: string) => trackEvent({ action: 'shrine_plaque', category: 'shrine', label: `${key}:hall` })
  const cls = 'shrine-plaque-glow pointer-events-auto absolute grid place-items-center leading-none'

  return (
    <div
      aria-label="의식각"
      className="pointer-events-none absolute inset-y-0"
      style={{ left: `${HALL_X0}%`, width: `${HALL_W}%`, zIndex: HALL_Z }}
    >
      {SHRINE_PLAQUES.map((p, i) => {
        const lit = attention?.[p.key] === true
        const pos: CSSProperties = {
          left: `${COL_X[i % 2]}%`,
          top: `${ROW_Y[Math.floor(i / 2)]}%`,
          ...plaqueStyle(),
        }
        if (p.kind === 'sheet') {
          const open = onOpenSheet?.[p.sheet]
          if (!open) return null
          return (
            <button
              key={p.key}
              type="button"
              aria-label={p.ariaLabel}
              onClick={() => {
                track(p.key)
                open()
              }}
              className={cls}
              style={pos}
            >
              <Face p={p} lit={lit} />
            </button>
          )
        }
        return (
          <Link
            key={p.key}
            href={p.href}
            aria-label={p.ariaLabel}
            onClick={() => track(p.key)}
            className={cls}
            style={pos}
          >
            <Face p={p} lit={lit} />
          </Link>
        )
      })}
    </div>
  )
}
