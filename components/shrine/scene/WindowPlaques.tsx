'use client'

/**
 * 창방 팻말(懸板) — 신당 벽에 걸린 의식 진입점 (CEO 지시 2026-07-30).
 *
 * 시드 구조물이 아니라 **런타임 오버레이**다. 근거 셋:
 *  1) StageLayers 의 구조물은 `pointer-events-none` 으로 그려진다 — 탭이 이 기능의 전부인데
 *     구조물로는 손에 걸리지 않는다.
 *  2) 구조물은 구역 컨테이너 폭 대비 % 라 벽 무라의 object-cover 크롭을 따라가지 못한다.
 *     방 종횡비가 바뀌면 팻말만 남고 창이 미끄러진다(실측 약 110px).
 *  3) 구조물 추가는 마이그레이션이 필요하고, 시드 계약 테스트(banga-wide-seed)가 구조물
 *     코드 3종을 못박고 있어 계약을 함께 흔들어야 한다. 진입점 하나를 위해 치를 값이 아니다.
 *
 * 좌표는 벽 무라 픽셀로만 다룬다 — 배율 환산은 CSS(`.shrine-plaque`)가 cover 식 그대로 한다.
 * 연출 CSS 는 app/shrine-scene.css 에만 둔다(styled-jsx 는 App Router 산출물에 실리지 않는다).
 *
 * ── 팻말은 두 종류다 (CEO 6차 지시로 액막이가 합류하며 갈렸다)
 *  · `page`  전용 페이지로 나간다 → <Link>
 *  · `sheet` **방 안에서** 시트를 연다 → <button>. 액막이는 촛불에서 불을 받는 의식이라
 *            페이지로 내보내면 불이 없는 곳에서 부적을 태우게 된다. 그래서 이동이 아니라
 *            방 하단 액막이 스트립과 **같은 시트**를 켠다(핸들러는 룸이 준다).
 *            핸들러가 없으면(= 스트립이 안 그려지는 상태) 그 팻말은 아예 걸지 않는다 —
 *            눌러도 아무 일도 없는 널이 벽에 남는 것이 가장 나쁜 결말이다.
 */

import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import {
  PLAQUE_SPRITE_URL,
  SHRINE_PLAQUES,
  plaqueBandVars,
  plaqueOffsetX,
  type PlaqueSheet,
  type ShrinePlaque,
} from '@/lib/domain/shrine/plaque'
import { trackEvent } from '@/lib/analytics/ga4'

type PlaqueVars = CSSProperties & { '--plq-dx': number }
type BandVars = CSSProperties & ReturnType<typeof plaqueBandVars>

interface Props {
  /** 방 안 시트를 여는 손잡이. 이 키에 핸들러가 없으면 해당 팻말을 걸지 않는다. */
  onOpenSheet?: Partial<Record<PlaqueSheet, () => void>>
  /**
   * 팻말별 「오늘 할 일이 남았다」 표식 — true 면 처마 등(燈) 점이 켜진다.
   *
   * ⚠️ 서버 현황(remaining 등)에서만 계산한다 — 근거 없는 점은 소음이고, 소음이 된 표식은
   *    진짜 할 일이 남았을 때도 무시된다.
   */
  attention?: Partial<Record<string, boolean>>
}

/** 널 한 장의 공통 겉모습 — Link/button 두 껍데기가 같은 널을 쓰도록 한 곳에 둔다. */
function plaqueStyle(p: ShrinePlaque): PlaqueVars {
  return {
    '--plq-dx': plaqueOffsetX(p.cx),
    // 널이 404 여도 글자는 남는다 — 어두운 나무 면을 색으로 깔아 둔다
    backgroundColor: 'rgba(38,26,14,0.92)',
    backgroundImage: `url('${PLAQUE_SPRITE_URL}')`,
    backgroundSize: '100% 100%',
    backgroundRepeat: 'no-repeat',
  }
}

function PlaqueFace({ p, lit }: { p: ShrinePlaque; lit: boolean }): ReactNode {
  return (
    <>
      {/* 처마 등 — 오늘 할 일이 남은 팻말에만 켜진다(널과 같은 배율을 탄다) */}
      {lit && (
        <span
          aria-hidden
          className="shrine-plaque-ember"
          style={{
            width: 'calc(7 * var(--plq-s))',
            height: 'calc(7 * var(--plq-s))',
            top: 'calc(6 * var(--plq-s))',
            right: 'calc(7 * var(--plq-s))',
          }}
        />
      )}
      <span
        aria-hidden
        className="font-serif text-gold-500/70"
        // 글자도 널과 같은 배율을 타야 한다 — px 로 두면 좁은 폰에서 널 밖으로 넘친다
        style={{ fontSize: 'calc(12 * var(--plq-s))', letterSpacing: 'calc(0.5 * var(--plq-s))' }}
      >
        {p.hanja}
      </span>
      <span
        className="font-serif font-bold text-[#F2DEA8]"
        style={{ fontSize: 'calc(22 * var(--plq-s))', marginTop: 'calc(2 * var(--plq-s))' }}
      >
        {p.ko}
      </span>
    </>
  )
}

const PLAQUE_CLASS = 'shrine-plaque shrine-plaque-glow grid place-items-center leading-none'

export function WindowPlaques({ onOpenSheet, attention }: Props) {
  const track = (key: string) => trackEvent({ action: 'shrine_plaque', category: 'shrine', label: key })

  return (
    <div className="shrine-plaque-band" style={plaqueBandVars() as BandVars}>
      {SHRINE_PLAQUES.map((p) => {
        const lit = attention?.[p.key] === true
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
              className={PLAQUE_CLASS}
              style={plaqueStyle(p)}
            >
              <PlaqueFace p={p} lit={lit} />
            </button>
          )
        }
        return (
          <Link
            key={p.key}
            href={p.href}
            aria-label={p.ariaLabel}
            onClick={() => track(p.key)}
            className={PLAQUE_CLASS}
            style={plaqueStyle(p)}
          >
            <PlaqueFace p={p} lit={lit} />
          </Link>
        )
      })}
    </div>
  )
}
