'use client'

import { useMemo, type CSSProperties, type JSX } from 'react'
import { hallAvatar } from '@/lib/domain/shrine/family-hall-layout'
import { FSHELF_TIERS, readFamilyShelf, type FamilyShelfUnit } from '@/lib/domain/shrine/family-shelf'
import type { Element, Placement } from '@/lib/domain/shrine/types'

/**
 * 가족 선반장(사방탁자) 벽 — 기본 사양 가구. 상점 아이템이 아니라 **가족 수만큼 저절로 선다**.
 *
 * 맨 위 칸 = 그 가족의 자리(정령 아바타 + 이름), 그 아래 한 칸 = 진열 칸.
 * 유닛은 배치가 아니므로 끌 수 없고(pointer-events 없음), 아이템 대역(z 10~29) **아래**(z 9)에
 * 서서 진열된 아이템이 언제나 앞에 그려진다.
 *
 * ── v2 「1가족 1진열」 (2026-08-12 · CEO 「가족선반 B안으로 수정」) ────────────────
 *  · 자산  `shelf-sabang.webp` → **`shelf-sabang-v2.webp`** (2단 · 칸 안폭 80.2% · 발밑 여백 0).
 *    파일명 버전업이 계약이다 — 같은 이름으로 덮어쓰면 폰 캐시가 옛 그림을 준다.
 *  · 아바타 지름을 **칸 높이에서 파생**한다. 종전에는 유닛 «폭»의 46% 였는데, 세계가 3.2화면이라
 *    가로 1%p 는 세로 1%p 의 3.2배다 — 기준 방에서 원반(66px)이 칸(41px)의 160% 로 삐져나왔다.
 *    세로에서 파생하면 어느 기기에서도 칸 안에 들어앉는다(PLAN §3-3 검수 ⑥).
 *  · 접지 그림자 — 「붕 떠 보임」(CEO 지시 ③)의 처방. 발끝 줄에 어두운 타원 하나.
 *
 * ⚠️ 축복(readFamilyShelf)이 켜지면 유닛이 은은히 깨어난다 — 애니메이션은 기존
 *    `shelf-blessed-aura` 클래스를 재사용한다(새 keyframes 금지 — CSS 게이트 불변).
 */

const FSHELF_Z = 9
const SPRITE = '/shrine/stage/banga/shelf-sabang-v2.webp'

/** 가족 자리 원반 — 칸(개구) 높이의 이 비율. 나머지 16%가 칸 위아래 숨통이다. */
const AVATAR_BAY_FILL = 0.84

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

  // 칸1(가족 자리) 기하 — 유닛 높이 비율. 원반·이름패가 전부 여기서 파생한다.
  const [bayTop, bayBottom] = FSHELF_TIERS.familyBay
  const avatarPct = (bayBottom - bayTop) * AVATAR_BAY_FILL * 100
  /** 이름패는 아바타 칸 아래 **널1** 위에 걸린다(칸 안이 아니라 널 위 — 실제 문패의 자리) */
  const namePct = ((bayBottom + FSHELF_TIERS.displayTop) / 2) * 100

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
            {/* 접지 그림자 — 몸체보다 뒤(먼저 그린다)라 다리 사이로 비친다. 「닿아 있음」의 전부다 */}
            <span aria-hidden className="shrine-fixture-contact" />
            {/* 사방탁자 몸체 — 박스에 딱 맞춘다(fill). 칸 상수(FSHELF_TIERS)가 이 정합에 기대므로
                contain 으로 바꾸면 진열 칸과 널이 어긋난다.
                그림자는 **짧게** — 벽 접지선까지 물러난 가구의 그림자는 길지 않다(원근) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={SPRITE}
              alt=""
              draggable={false}
              decoding="async"
              className="absolute inset-0 h-full w-full"
              style={{ objectFit: 'fill', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
            />
            {/* 맨 위 칸 — 가족 자리(정령 아바타). 사랑방(hallAvatar)과 같은 실체 규약:
                미설정·경로형은 이니셜 오브로라도 반드시 나온다.
                지름은 **칸 높이**에서 파생한다(aspect-ratio 1) — 유닛 폭에서 파생하면 세계가
                3.2화면이라 기준 방에서 칸을 넘는다 */}
            <span
              className="absolute left-1/2 overflow-hidden rounded-full"
              style={{
                top: `${FSHELF_TIERS.family * 100}%`,
                height: `${avatarPct}%`,
                aspectRatio: '1 / 1',
                transform: 'translate(-50%, -50%)',
                border: `1.5px solid ${blessed ? 'rgba(201,168,76,0.95)' : 'rgba(201,168,76,0.5)'}`,
                backgroundColor: `${avatar.color}44`,
                boxShadow: blessed ? '0 0 12px rgba(201,168,76,0.55)' : '0 1px 5px rgba(0,0,0,0.5)',
              }}
            >
              {avatar.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar.src} alt="" className="h-full w-full object-cover object-top" draggable={false} />
              ) : (
                <span className="grid h-full w-full place-items-center font-serif text-[11px] leading-none text-gold-200">
                  {avatar.initial}
                </span>
              )}
            </span>
            {/* 이름패 — 아바타 칸 아래 널에 걸린다. 긴 이름은 널 밖으로 넘치지 않고 말줄임된다
                (종전 whitespace-nowrap 만으로는 좁은 폰에서 기둥 밖까지 삐져나왔다) */}
            <span
              className="absolute left-1/2 max-w-[96%] overflow-hidden text-ellipsis whitespace-nowrap rounded-[4px] px-1 py-[1px] text-center font-sans text-[9px] font-bold"
              style={{
                top: `${namePct}%`,
                transform: 'translate(-50%, -50%)',
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
