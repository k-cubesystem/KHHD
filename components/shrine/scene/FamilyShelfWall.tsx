'use client'

import { useMemo, type CSSProperties, type JSX } from 'react'
import { hallAvatar } from '@/lib/domain/shrine/family-hall-layout'
import { FSHELF_TIERS, readFamilyShelf, type FamilyShelfUnit } from '@/lib/domain/shrine/family-shelf'
import type { Element, Placement } from '@/lib/domain/shrine/types'

/**
 * 가족 선반장(사방탁자) 벽 — 기본 사양 가구. 상점 아이템이 아니라 **가족 수만큼 저절로 선다**.
 *
 * 맨 위 칸 = 그 가족의 자리(정령 아바타 + 이름), 아래 세 칸 = 진열 칸(앵커는 룸이 합류시킨다).
 * 유닛은 배치가 아니므로 끌 수 없고(pointer-events 없음), 아이템 대역(z 10~29) **아래**(z 9)에
 * 서서 진열된 아이템이 언제나 앞에 그려진다.
 *
 * ⚠️ 축복(readFamilyShelf)이 켜지면 유닛이 은은히 깨어난다 — 애니메이션은 기존
 *    `shelf-blessed-aura` 클래스를 재사용한다(새 keyframes 금지 — CSS 게이트 불변).
 */

const FSHELF_Z = 9
const SPRITE = '/shrine/stage/banga/shelf-sabang.webp'

type CssVars = CSSProperties & Record<`--${string}`, string>

export function FamilyShelfWall({
  units,
  placements,
  elementOf,
  idle,
}: {
  units: readonly FamilyShelfUnit[]
  placements: readonly Placement[]
  elementOf: (catalogItemId: string) => Element | null
  /** 연출 허용(게이트 on + 편집 아님) — 축복 맥동은 이때만 */
  idle: boolean
}): JSX.Element | null {
  const readings = useMemo(
    () => units.map((u) => readFamilyShelf(u, placements, elementOf)),
    [units, placements, elementOf]
  )
  if (units.length === 0) return null

  return (
    <>
      {units.map((u, i) => {
        const avatar = hallAvatar(u.avatarId, u.name)
        const blessed = readings[i]?.blessed === true
        const wrap: CssVars = {
          left: `${u.x - u.w / 2}%`,
          top: `${u.top}%`,
          width: `${u.w}%`,
          height: `${u.bottom - u.top}%`,
          zIndex: FSHELF_Z,
        }
        return (
          <div key={u.key} aria-hidden className="absolute pointer-events-none select-none" style={wrap}>
            {/* 축복 후광 — 가족의 정령 오행 아이템이 진열되면 유닛이 깨어난다 */}
            {blessed && idle && (
              <span
                className="shelf-blessed-aura absolute inset-x-[-14%] inset-y-[-4%] rounded-[14px]"
                style={{
                  background:
                    'radial-gradient(ellipse at 50% 40%, rgba(201,168,76,0.34) 0%, rgba(201,168,76,0.12) 55%, rgba(201,168,76,0) 78%)',
                }}
              />
            )}
            {/* 사방탁자 몸체 — 박스에 딱 맞춘다(fill). 칸 상수(FSHELF_TIERS)가 이 정합에 기대므로
                contain 으로 바꾸면 진열 앵커와 널이 어긋난다 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={SPRITE}
              alt=""
              draggable={false}
              decoding="async"
              className="absolute inset-0 h-full w-full"
              style={{ objectFit: 'fill', filter: 'drop-shadow(0 5px 6px rgba(0,0,0,0.45))' }}
            />
            {/* 맨 위 칸 — 가족 자리(정령 아바타). 사랑방(hallAvatar)과 같은 실체 규약:
                미설정·경로형은 이니셜 오브로라도 반드시 나온다 */}
            <span
              className="absolute left-1/2 overflow-hidden rounded-full"
              style={{
                top: `${FSHELF_TIERS.family * 100}%`,
                width: '46%',
                aspectRatio: '1 / 1',
                transform: 'translate(-50%, -58%)',
                border: `1.5px solid ${blessed ? 'rgba(201,168,76,0.95)' : 'rgba(201,168,76,0.5)'}`,
                backgroundColor: `${avatar.color}44`,
                boxShadow: blessed ? '0 0 12px rgba(201,168,76,0.55)' : '0 1px 5px rgba(0,0,0,0.5)',
              }}
            >
              {avatar.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar.src} alt="" className="h-full w-full object-cover object-top" draggable={false} />
              ) : (
                <span className="grid h-full w-full place-items-center font-serif text-[13px] leading-none text-gold-200">
                  {avatar.initial}
                </span>
              )}
            </span>
            {/* 이름패 — 맨 위 칸 아래 널에 걸린다 */}
            <span
              className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[5px] px-1.5 py-[1px] font-sans text-[9px] font-bold"
              style={{
                top: `${FSHELF_TIERS.family * 100}%`,
                transform: 'translate(-50%, 46%)',
                background: 'rgba(20,14,8,0.78)',
                border: '1px solid rgba(201,168,76,0.35)',
                color: 'rgba(244,228,186,0.92)',
              }}
            >
              {u.name}
            </span>
          </div>
        )
      })}
    </>
  )
}
