'use client'

import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import { PLAQUE_SPRITE_URL, SHRINE_PLAQUES, type PlaqueSheet, type ShrinePlaque } from '@/lib/domain/shrine/plaque'
import { STAGE_WALL_GROUND_LINE_Y } from '@/lib/domain/shrine/theme-stage'
import { trackEvent } from '@/lib/analytics/ga4'

/**
 * 의식각(儀式閣) — 방 오른쪽에 **현판 걸이(사방탁자)를 놓고 그 위에** 의식 현판 4문을 진열한다
 * (2026-08-06 2차 지시: "간판들도 선반을 놓고 그 위에다가 놔줘").
 *
 * v1 은 현판이 벽에 떠 있었다 — v2 는 사방탁자 한 좌를 세우고, 네 개의 면(맨 위 칸 + 2·3단 +
 * 하단 수납장 앞면)에 현판을 한 장씩 얹는다:
 * 엽전 → 액막이 → 오방기 → 백일기도 (의식의 호흡 순서, SHRINE_PLAQUES 정의 그대로).
 *
 *  · 좌표는 **world %** — stageContent(대청=세계 전체) 안에 살아 카메라 팬을 함께 탄다.
 *  · 선반 몸체는 배경(fill — FamilyShelfWall 과 같은 정합 규약), 현판만 상호작용한다.
 *  · 처마 등(attention)·시트/페이지 갈래(kind)는 창방 팻말의 계약을 그대로 승계한다.
 *
 * ── v3 (2026-08-12 · CEO 지시 ①「선반과 간판은 좀 더 뒤로」 ④「오른쪽 간판도 수정 · 글씨 1개씩」) ──
 *  ① **가족 선반장에서 독립했다.** v2 까지는 세로(top·bottom)를 `FSHELF_UNIT` 에서 그대로
 *     가져왔다 — 「같은 사방탁자 한 좌」라는 이유였는데, 가족 선반장이 B안으로 2단·28%p 가 되는
 *     순간 **의식각 현판 4문이 같이 찌그러진다**(승계가 곧 지뢰였다). 둘은 이제 다른 가구다:
 *     가족 선반장은 2단 진열장이고 의식각은 4면 현판 걸이다. 공유하는 것은 **벽 접지선 하나**뿐이다.
 *  ② **뒤로** — 밑동을 틀 접지선(82)에서 벽 접지선(**76**)으로 옮기고, 폭 8.65 → **7.6** ·
 *     세로 42 → **36** 으로 줄인다. 원근에서 뒤로 가는 것은 작아지는 것이다.
 *  ③ **글씨 한 줄** — 한자 병기를 걷고 한글만 남긴다(부적 한글화와 같은 방향: 「읽히는 한글」).
 *     남은 한 줄은 **널 폭에서 파생한 크기**(컨테이너 질의)라 기기가 바뀌어도 널 안에 든다.
 *  ④ **접지** — 걸이 스프라이트의 발밑 투명 여백을 잘라 낸 v2 자산을 쓰고(상자 하단 = 그려진
 *     발끝), 발 밑에 접지 그림자를 깐다. drop-shadow 도 짧게 — 멀리 있는 물건의 그림자는 짧다.
 */

/** 유닛 세로(무대 %) — 현판 4문이 서로 안 겹치는 최소치에서 왔다(현판 세로 = 널 폭 × 2/5). */
const RITUAL_HALL_H = 36

/**
 * 유닛 기하(world %) — **의식각 고유값**이다(가족 선반장 승계 폐지, 위 v3 ①).
 * 룸이 「고정 살림 조절」 손잡이 상자를 이 값에서 파생하므로 **export 가 단일 출처**다
 * (두 곳이 상수를 따로 들면 손잡이는 옛 자리에, 살림은 새 자리에 서는 조용한 어긋남이 난다).
 *
 * x 88.75 는 제단(41~59)·가족 선반장 오른벽(67·75.5, 우단 78.9)을 피한 자리다.
 * 폭 7.6 이라 좌단 84.95 — 선반장과 6.05%p 떨어져 서고, 우단 92.55 로 벽 안에 든다.
 */
export const RITUAL_HALL_UNIT = Object.freeze({
  x: 88.75,
  w: 7.6,
  top: STAGE_WALL_GROUND_LINE_Y - RITUAL_HALL_H,
  bottom: STAGE_WALL_GROUND_LINE_Y,
})
const UNIT_X = RITUAL_HALL_UNIT.x
const UNIT_W = RITUAL_HALL_UNIT.w
const UNIT_TOP = RITUAL_HALL_UNIT.top
const UNIT_BOTTOM = RITUAL_HALL_UNIT.bottom
/** 아이템 대역(10~29) 최상단 — 진입 현판이 신물에 가려지면 안 된다. UI(z 30) 아래. */
const HALL_Z = 29

/**
 * 현판 세로 자리 — 걸이 네 면(맨 위 칸·2단·3단·하단 수납장 앞)의 **개구 중심**,
 * 유닛 높이 비율. `shelf-rack-v2.webp`(306×623) 알파 실측값이다
 * (scripts/shrine-assets/stage-shelf-v2.mjs 가 굽고 이 배열을 출력한다).
 *
 * ⚠️ v2 까지의 [0.155, 0.425, 0.65, 0.865] 는 손으로 적은 값이었고 2~4번째가 실측보다
 *    0.047~0.057 **아래**였다 — 현판이 칸 아래턱을 물고 있었다(PLAN-family-shelf-v2 §4).
 *    자산을 다시 구우면 스크립트 출력으로 이 줄을 갱신한다.
 */
const PLAQUE_CY = [0.162, 0.388, 0.616, 0.829] as const
/**
 * 현판 폭 — 유닛 폭 대비 %. 비율 5:2 는 널 스프라이트 몰딩·놋쇠 못의 계약이다.
 * 82 는 «네 장이 세로로 안 겹치는» 상한이다: 기준 방에서 널 세로 = 0.82 × 7.6%p × 방폭×3.2 × 2/5
 * ≈ 41.5px 이고 가장 좁은 칸 간격이 47.5px 라 6px 이 남는다(86 이면 3px — 눈에 붙어 보인다).
 */
const PLAQUE_W_PCT = 82

/** 걸이 몸체 — 가족 선반장과 **다른 자산**이다(4면 유지 · 여백만 걷어 접지를 맞춘 v2). */
const SHELF_SPRITE = '/shrine/stage/banga/shelf-rack-v2.webp'

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
    filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.55))',
  }
}

/**
 * 널 한 장의 얼굴 — **한글 한 줄**(CEO 지시 ④ "간판도 지금 글씨가 2개야, 1개씩으로").
 * 한자 병기(擲 錢 / 厄 막 이 …)를 걷었다. 글자 크기·자간은 `.shrine-hall-plaque` 가 널 폭에서
 * 파생한다 — px 로 박으면 기준 방(널 104px)과 390폰(널 76px) 사이에서 한쪽이 반드시 어색해진다.
 */
function Face({ p, lit }: { p: ShrinePlaque; lit: boolean }): ReactNode {
  return (
    <>
      {lit && <span aria-hidden className="shrine-plaque-ember" style={{ width: 6, height: 6, top: 4, right: 6 }} />}
      <span className="font-serif font-bold text-[#F2DEA8]">{p.ko}</span>
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
  const cls = 'shrine-hall-plaque shrine-plaque-glow pointer-events-auto absolute grid place-items-center leading-none'
  const dx = offset?.dx ?? 0
  const dy = offset?.dy ?? 0

  return (
    <div
      aria-label="의식각"
      className="shrine-hall pointer-events-none absolute"
      style={{
        left: `${UNIT_X - UNIT_W / 2 + dx}%`,
        top: `${UNIT_TOP + dy}%`,
        width: `${UNIT_W}%`,
        height: `${UNIT_BOTTOM - UNIT_TOP}%`,
        zIndex: HALL_Z,
      }}
    >
      {/* 접지 그림자 — 「붕 떠 보임」의 처방(CEO 지시 ③). 발끝 줄에 깔리는 어두운 타원 하나가
          «바닥에 닿아 있다»를 만든다. 몸체보다 **뒤**에 그려야 다리 사이로 비쳐 보인다 */}
      <span aria-hidden className="shrine-fixture-contact" />
      {/* 걸이 몸체 — 상자에 딱 맞춘다(fill). 현판 자리 상수(PLAQUE_CY)가 이 정합에 기대므로
          contain 으로 바꾸면 현판이 널에서 떨어진다 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={SHELF_SPRITE}
        alt=""
        draggable={false}
        decoding="async"
        className="absolute inset-0 h-full w-full"
        style={{ objectFit: 'fill', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
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
              className="shrine-hall-plaque shrine-plaque-glow absolute grid place-items-center leading-none"
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
