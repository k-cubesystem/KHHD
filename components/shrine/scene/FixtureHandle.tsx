'use client'

import { useCallback, useRef, type CSSProperties, type JSX, type PointerEvent as RPointerEvent } from 'react'
import {
  FIXTURE_DX_RANGE,
  FIXTURE_DY_RANGE,
  FIXTURE_SCALE_RANGE,
  FIXTURE_SCALE_STEP,
  clampFixtureOffset,
  fixtureScale,
  type FixtureKey,
  type FixtureOffset,
} from '@/lib/domain/shrine/fixture-offsets'

/**
 * 고정 살림 이동 손잡이 — 꾸미기 모드에서만 나타나는 «점선 테두리 + 잡이».
 *
 * ── 왜 살림 자체가 아니라 별 손잡이인가
 * 선반장·의식각·신위 무대는 배치(placements)가 아니라 **기본 사양 렌더물**이다. 그 그림에 직접
 * 포인터를 다는 순간 «탭하면 무슨 일이 나는 것»이 되어 보기 모드의 문법(현판=이동, 신위=회전)과
 * 싸운다. 손잡이를 형제로 세우면 살림 컴포넌트들은 좌표만 받는 순수 렌더로 남는다.
 *
 * ── 아이템이 항상 이긴다
 * z 는 **아이템 대역(10~29) 아래**다. 신물이 놓인 지점에서는 신물이 포인터를 먼저 받으므로
 * "고정 살림 히트 판정은 배치 아이템이 없는 지점에서만" 이 히트테스트로 저절로 성립한다
 * (조건문 하나 없이 — 조건문으로 흉내 내면 두 드래그가 서로를 몰라 언젠가 어긋난다).
 *
 * ── 좌표 계약
 * 반드시 **stageContent 의 직계 형제**로 렌더한다. 드래그 환산이 `parentElement` 의 실측 박스를
 * 기준으로 삼기 때문이다 — 두루마리에서는 대청 박스, 단일 무대에서는 방이 그 부모다(Sprite 와 같은 계약).
 * ⚠️ 래퍼를 끼우면 Sprite 의 좌표 기준까지 함께 어긋난다.
 *
 * 애니메이션 없음(정적 스타일만) — 새 keyframes 를 만들지 않으므로 CSS 3곳 등록 규율 대상이 아니다.
 */

/** 손잡이 상자 — 대청 로컬 %(살림이 차지하는 자리). 오프셋은 호출부가 이미 얹어 보낸다. */
export interface FixtureBox {
  left: number
  top: number
  width: number
  height: number
}

/** 아이템 대역(10~29) 바로 아래 — 신물이 언제나 손잡이를 이긴다. 선반장(FSHELF_Z)과 같은 층. */
const HANDLE_Z = 9

/** 살림 그림 바깥으로 물러나는 여백(px). 테두리가 스프라이트에 가려지지 않게 한다. */
const HALO_PX = 4

/** 이 거리(px)를 넘겨야 «옮겼다»로 친다 — 손 떨림이 저장을 부르지 않게. */
const DRAG_DECIDE_PX = 8

export interface FixtureHandleProps {
  kind: FixtureKey
  /** 살림이 지금 차지한 자리(오프셋 반영 후) */
  box: FixtureBox
  /** 현재 오프셋 — 드래그는 이 값에서 이어 간다 */
  offset: FixtureOffset
  /** 스크린리더·툴팁 이름 */
  label: string
  /** 드래그 중(낙관 반영). 클램프된 값만 올라온다 */
  onDrag: (kind: FixtureKey, next: FixtureOffset) => void
  /** 놓음 — 실제로 움직였을 때만 호출된다(저장·동반 이동의 유일한 진입점) */
  onCommit: (kind: FixtureKey, next: FixtureOffset) => void
  /**
   * 크기 조절(−/＋)을 함께 보일 것인가.
   *
   * 🔴 신위 무대만 켠다. 선반장·의식각은 «크기»가 가구 스프라이트의 몫이라 배율을 주면
   *    칸 기하(FSHELF_TIERS)와 진열 앵커가 통째로 어긋난다 — 그건 다른 작업이다.
   */
  resizable?: boolean
}

export function FixtureHandle({
  kind,
  box,
  offset,
  label,
  onDrag,
  onCommit,
  resizable = false,
}: FixtureHandleProps): JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const moved = useRef(false)
  const nextRef = useRef<FixtureOffset>(offset)

  const onPointerDown = useCallback(
    (e: RPointerEvent<HTMLSpanElement>) => {
      e.preventDefault()
      // 두루마리 카메라와의 3자 조정 — 손잡이에서 시작한 드래그가 방 팬으로 새면 안 된다(Sprite 와 같은 규약)
      e.stopPropagation()
      const el = e.currentTarget
      // 손잡이 상자의 부모 = 무대 박스. Sprite 와 **같은 기준**이라 % 환산이 한 벌로 끝난다.
      const room = ref.current?.parentElement
      if (!room) return
      const rect = room.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return

      dragging.current = true
      moved.current = false
      nextRef.current = offset
      el.setPointerCapture(e.pointerId)
      const startX = e.clientX
      const startY = e.clientY
      const base = offset

      const move = (ev: PointerEvent) => {
        if (!dragging.current) return
        const px = ev.clientX - startX
        const py = ev.clientY - startY
        if (!moved.current && Math.hypot(px, py) < DRAG_DECIDE_PX) return
        moved.current = true
        // 클램프는 드래그 중에도 건다 — «끌 수 있는 곳»과 «저장되는 곳»이 달라지면 손이 거짓말을 배운다
        const next = clampFixtureOffset({
          dx: base.dx + (px / rect.width) * 100,
          dy: base.dy + (py / rect.height) * 100,
        })
        nextRef.current = next
        onDrag(kind, next)
      }
      const up = () => {
        dragging.current = false
        el.removeEventListener('pointermove', move)
        el.removeEventListener('pointerup', up)
        el.removeEventListener('pointercancel', up)
        if (moved.current) onCommit(kind, nextRef.current)
      }
      el.addEventListener('pointermove', move)
      el.addEventListener('pointerup', up)
      el.addEventListener('pointercancel', up)
    },
    [kind, offset, onDrag, onCommit]
  )

  /**
   * 크기 한 칸 조절. 드래그와 달리 **누른 즉시 확정**한다(저장까지) — 버튼은 «놓는» 동작이 없다.
   * 클램프는 도메인이 진다(clampFixtureOffset) — 여기서 범위를 다시 적지 않는다.
   */
  const step = useCallback(
    (dir: 1 | -1) => {
      const next = clampFixtureOffset({ ...offset, scale: fixtureScale(offset) + dir * FIXTURE_SCALE_STEP })
      onDrag(kind, next)
      onCommit(kind, next)
    },
    [kind, offset, onDrag, onCommit]
  )

  const scale = fixtureScale(offset)
  const atMin = scale <= FIXTURE_SCALE_RANGE[0]
  const atMax = scale >= FIXTURE_SCALE_RANGE[1]

  const halo: CSSProperties = {
    left: `calc(${box.left}% - ${HALO_PX}px)`,
    top: `calc(${box.top}% - ${HALO_PX}px)`,
    width: `calc(${box.width}% + ${HALO_PX * 2}px)`,
    height: `calc(${box.height}% + ${HALO_PX * 2}px)`,
    zIndex: HANDLE_Z,
    border: '1px dashed rgba(201,168,76,0.55)',
    borderRadius: '8px',
    background: 'rgba(201,168,76,0.05)',
  }

  return (
    <div ref={ref} aria-hidden className="absolute pointer-events-none select-none" style={halo}>
      <span
        role="button"
        tabIndex={-1}
        aria-label={`${label} 자리 옮기기`}
        title={`${label} 자리 옮기기 (가로 ${FIXTURE_DX_RANGE[1]} · 세로 ${FIXTURE_DY_RANGE[1]}%p 까지)`}
        onPointerDown={onPointerDown}
        onClick={(e) => e.stopPropagation()}
        className="pointer-events-auto absolute left-1/2 grid h-[22px] w-[22px] -translate-x-1/2 place-items-center rounded-full text-[11px] leading-none text-[#f4e4ba]"
        style={{
          top: '-13px',
          cursor: 'grab',
          background: 'rgba(26,19,8,0.92)',
          border: '1px solid rgba(201,168,76,0.75)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.55)',
          touchAction: 'none',
        }}
      >
        ✥
      </span>

      {/* 크기 조절 — 이동(✥)과 **다른 축**이다. 발을 고정한 채 키만 오르내린다.
          🔴 이동 손잡이에 크기를 겹치지 말 것: 한 손잡이가 두 일을 하면 «옮겼는데 커졌다»가
             다시 생긴다(2026-08-25 상반신 사고). */}
      {resizable && (
        <span
          className="pointer-events-auto absolute left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full px-1.5 py-[3px]"
          style={{
            bottom: '-14px',
            background: 'rgba(26,19,8,0.92)',
            border: '1px solid rgba(201,168,76,0.75)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.55)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            aria-label={`${label} 작게`}
            title={`${label} 작게`}
            disabled={atMin}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => step(-1)}
            className="grid h-[18px] w-[18px] place-items-center rounded-full text-[13px] leading-none text-[#f4e4ba] disabled:opacity-30"
          >
            −
          </button>
          <span className="min-w-[30px] text-center text-[10px] tabular-nums text-[#f4e4ba]/70">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            aria-label={`${label} 크게`}
            title={`${label} 크게`}
            disabled={atMax}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => step(1)}
            className="grid h-[18px] w-[18px] place-items-center rounded-full text-[13px] leading-none text-[#f4e4ba] disabled:opacity-30"
          >
            ＋
          </button>
        </span>
      )}
    </div>
  )
}
