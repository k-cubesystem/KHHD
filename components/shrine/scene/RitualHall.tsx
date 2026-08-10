'use client'

import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import { FSHELF_UNIT } from '@/lib/domain/shrine/family-shelf'
import { PLAQUE_SPRITE_URL, SHRINE_PLAQUES, type PlaqueSheet, type ShrinePlaque } from '@/lib/domain/shrine/plaque'
import { trackEvent } from '@/lib/analytics/ga4'

/**
 * 의식각(儀式閣) — 방 오른쪽에 **선반(사방탁자)을 놓고 그 위에** 의식 현판 4문을 진열한다
 * (2026-08-06 2차 지시: "간판들도 선반을 놓고 그 위에다가 놔줘").
 *
 * v1 은 현판이 벽에 떠 있었다 — v2 는 가족 선반장과 같은 사방탁자 한 좌를 세우고,
 * 네 개의 열린 칸(맨 위 칸 + 3단 + 하단 수납장 앞면)에 현판을 한 장씩 얹는다:
 * 엽전 → 액막이 → 오방기 → 백일기도 (의식의 호흡 순서, SHRINE_PLAQUES 정의 그대로).
 * 가족 선반장들과 같은 가구 문법이라 방이 한 세계로 읽힌다.
 *
 *  · 좌표는 **world %** — stageContent(대청=세계 전체) 안에 살아 카메라 팬을 함께 탄다.
 *  · 선반 몸체는 배경(fill — FamilyShelfWall 과 같은 정합 규약), 현판만 상호작용한다.
 *  · 처마 등(attention)·시트/페이지 갈래(kind)는 창방 팻말의 계약을 그대로 승계한다.
 */

/**
 * 유닛 기하(world %) — 가족 선반장(FSHELF_UNIT)과 같은 규격: 우측 공간 한가운데 선다.
 * 룸이 「고정 살림 조절」 손잡이 상자를 이 값에서 파생하므로 **export 가 단일 출처**다
 * (두 곳이 상수를 따로 들면 손잡이는 옛 자리에, 살림은 새 자리에 서는 조용한 어긋남이 난다).
 *
 * ⚠️ 세로(top·bottom)는 **FSHELF_UNIT 에서 그대로 가져온다** — 같은 사방탁자 한 좌이므로 숫자를
 *    따로 적으면 왼벽과 오른벽의 가구 높이가 조용히 갈라진다(2026-08-10 접지 수복에서 실제로
 *    두 곳을 같이 고쳐야 했던 자리다). 이제 마루선이 움직이면 둘이 함께 따라온다.
 *    x·w 만 의식각 고유값이다(제단 41~59 · 가족 선반장 오른벽 63.5/72.5 을 피한 자리).
 */
export const RITUAL_HALL_UNIT = Object.freeze({
  x: 88.75,
  w: FSHELF_UNIT.w,
  top: FSHELF_UNIT.top,
  bottom: FSHELF_UNIT.bottom,
})
const UNIT_X = RITUAL_HALL_UNIT.x
const UNIT_W = RITUAL_HALL_UNIT.w
const UNIT_TOP = RITUAL_HALL_UNIT.top
const UNIT_BOTTOM = RITUAL_HALL_UNIT.bottom
/** 아이템 대역(10~29) 최상단 — 진입 현판이 신물에 가려지면 안 된다. UI(z 30) 아래. */
const HALL_Z = 29

/**
 * 현판 세로 자리 — 사방탁자 4개 면(맨 위 칸·2단·3단·하단 수납장 앞)의 중심,
 * 유닛 높이 비율(shelf-sabang.webp 271×640 실측 개구부 중점).
 */
const PLAQUE_CY = [0.155, 0.425, 0.65, 0.865] as const
/** 현판 폭 — 유닛 안폭에 맞춘다. 비율 5:2 는 널 스프라이트 몰딩·놋쇠 못의 계약이다 */
const PLAQUE_W_PCT = 86

const SHELF_SPRITE = '/shrine/stage/banga/shelf-sabang.webp'

function plaqueStyle(cy: number): CSSProperties {
  return {
    left: '50%',
    top: `${cy * 100}%`,
    transform: 'translate(-50%, -50%)',
    width: `${PLAQUE_W_PCT}%`,
    aspectRatio: '5 / 2',
    // 널이 404 여도 글자는 남는다 — 어두운 나무 면을 색으로 깔아 둔다 (창방 팻말과 같은 방어)
    backgroundColor: 'rgba(38,26,14,0.92)',
    backgroundImage: `url('${PLAQUE_SPRITE_URL}')`,
    backgroundSize: '100% 100%',
    backgroundRepeat: 'no-repeat',
    filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.5))',
  }
}

function Face({ p, lit }: { p: ShrinePlaque; lit: boolean }): ReactNode {
  return (
    <>
      {lit && <span aria-hidden className="shrine-plaque-ember" style={{ width: 6, height: 6, top: 4, right: 6 }} />}
      <span aria-hidden className="font-serif text-[8px] tracking-[1px] text-gold-500/70">
        {p.hanja}
      </span>
      <span className="mt-[1px] font-serif text-[14px] font-bold text-[#F2DEA8]">{p.ko}</span>
    </>
  )
}

export function RitualHall({
  onOpenSheet,
  attention,
  offset,
  inert = false,
}: {
  /** 방 안 시트를 여는 손잡이 — 핸들러가 없으면 그 현판은 걸지 않는다(눌러도 조용한 널 금지) */
  onOpenSheet?: Partial<Record<PlaqueSheet, () => void>>
  /** 「오늘 할 일이 남았다」 처마 등 — 서버 현황에서만 계산된 값 */
  attention?: Partial<Record<string, boolean>>
  /** 고정 살림 조절 오프셋(무대 % 가산). 없으면 정본 자리 그대로 */
  offset?: { dx: number; dy: number }
  /**
   * 꾸미기 모드 — 현판을 **눌리지 않는 면**으로 바꾼다. 종전에는 꾸미기 중 의식각을 아예 내렸는데
   * (신물 드래그와 탭 대상이 겹쳐 배치가 페이지 이동으로 새던 문제), 그러면 자리를 맞출 대상이
   * 화면에서 사라져 「고정 살림 조절」 자체가 성립하지 않는다. 링크·버튼을 걷어 낸 채 **보이기만**
   * 하면 두 요구가 함께 선다(pointer-events 가 없으므로 드래그가 새어 나갈 경로도 없다).
   */
  inert?: boolean
}) {
  const track = (key: string) => trackEvent({ action: 'shrine_plaque', category: 'shrine', label: `${key}:hall` })
  const cls = 'shrine-plaque-glow pointer-events-auto absolute grid place-items-center leading-none'
  const dx = offset?.dx ?? 0
  const dy = offset?.dy ?? 0

  return (
    <div
      aria-label="의식각"
      className="pointer-events-none absolute"
      style={{
        left: `${UNIT_X - UNIT_W / 2 + dx}%`,
        top: `${UNIT_TOP + dy}%`,
        width: `${UNIT_W}%`,
        height: `${UNIT_BOTTOM - UNIT_TOP}%`,
        zIndex: HALL_Z,
      }}
    >
      {/* 사방탁자 몸체 — 가족 선반장과 같은 가구·같은 정합 규약(fill). 현판 자리 상수(PLAQUE_CY)가
          이 정합에 기대므로 contain 으로 바꾸면 현판이 널에서 떨어진다 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={SHELF_SPRITE}
        alt=""
        draggable={false}
        decoding="async"
        className="absolute inset-0 h-full w-full"
        style={{ objectFit: 'fill', filter: 'drop-shadow(0 5px 6px rgba(0,0,0,0.45))' }}
      />
      {SHRINE_PLAQUES.map((p, i) => {
        const lit = attention?.[p.key] === true
        const pos = plaqueStyle(PLAQUE_CY[i] ?? PLAQUE_CY[PLAQUE_CY.length - 1])
        if (inert) {
          // 꾸미기 중 — 그림만 남기고 손잡이는 걷는다(pointer-events 미부여 = 히트 대상 아님)
          return (
            <span
              key={p.key}
              aria-hidden
              className="shrine-plaque-glow absolute grid place-items-center leading-none"
              style={pos}
            >
              <Face p={p} lit={lit} />
            </span>
          )
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
