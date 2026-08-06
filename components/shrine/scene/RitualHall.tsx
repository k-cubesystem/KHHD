'use client'

import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
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

/** 유닛 기하(world %) — 가족 선반장(FSHELF_UNIT)과 같은 규격: 우측 공간 한가운데 선다 */
const UNIT_X = 88.75
const UNIT_W = 8.65
const UNIT_TOP = 20
const UNIT_BOTTOM = 62
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
      className="pointer-events-none absolute"
      style={{
        left: `${UNIT_X - UNIT_W / 2}%`,
        top: `${UNIT_TOP}%`,
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
