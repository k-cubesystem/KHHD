'use client'

/**
 * 창방 팻말(懸板) — 신당 벽에 걸린 의식 전용 페이지 진입점 (CEO 지시 2026-07-30).
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
 */

import Link from 'next/link'
import type { CSSProperties } from 'react'
import { PLAQUE_SPRITE_URL, SHRINE_PLAQUES, plaqueOffsetX } from '@/lib/domain/shrine/plaque'
import { trackEvent } from '@/lib/analytics/ga4'

type PlaqueVars = CSSProperties & { '--plq-dx': number }

export function WindowPlaques() {
  return (
    <div className="shrine-plaque-band">
      {SHRINE_PLAQUES.map((p) => (
        <Link
          key={p.key}
          href={p.href}
          aria-label={p.ariaLabel}
          onClick={() => trackEvent({ action: 'shrine_plaque', category: 'shrine', label: p.key })}
          className="shrine-plaque shrine-plaque-glow grid place-items-center leading-none"
          style={
            {
              '--plq-dx': plaqueOffsetX(p.cx),
              // 널이 404 여도 글자는 남는다 — 어두운 나무 면을 색으로 깔아 둔다
              backgroundColor: 'rgba(38,26,14,0.92)',
              backgroundImage: `url('${PLAQUE_SPRITE_URL}')`,
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
            } as PlaqueVars
          }
        >
          <span
            aria-hidden
            className="font-serif text-gold-500/70"
            // 글자도 널과 같은 배율을 타야 한다 — px 로 두면 좁은 폰에서 널 밖으로 넘친다
            style={{ fontSize: 'calc(14 * var(--plq-s))', letterSpacing: 'calc(1 * var(--plq-s))' }}
          >
            {p.hanja}
          </span>
          <span
            className="font-serif font-bold text-[#F2DEA8]"
            style={{ fontSize: 'calc(25 * var(--plq-s))', marginTop: 'calc(3 * var(--plq-s))' }}
          >
            {p.ko}
          </span>
        </Link>
      ))}
    </div>
  )
}
