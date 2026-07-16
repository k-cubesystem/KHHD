'use client'

import type { Deity } from '@/app/actions/shrine/deities'

export const ELEMENT_GLYPH: Record<string, string> = {
  wood: '🌿',
  fire: '🔥',
  earth: '⛰️',
  metal: '⚔️',
  water: '💧',
  all: '✨',
}

/** 신위 원형 초상 — 초상/스프라이트가 있으면 이미지, 없으면 aura 색상 + 오행 상징 폴백. */
export function DeityMedallion({ deity, size }: { deity: Deity; size: number }) {
  const accent = deity.aura.accent ?? '#C9A84C'
  const img = deity.portraitUrl ?? deity.spriteUrl
  return (
    <div
      className="relative flex items-center justify-center rounded-full overflow-hidden"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 50% 38%, ${accent}66, ${accent}18 62%, transparent 78%)`,
        boxShadow: `0 0 ${size / 3}px ${accent}55, inset 0 0 ${size / 5}px ${accent}44`,
      }}
    >
      <div className="absolute inset-[10%] rounded-full border z-[1]" style={{ borderColor: `${accent}66` }} />
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={img}
          alt={deity.name}
          className="absolute inset-0 w-full h-full object-contain p-[6%]"
          style={{ filter: `drop-shadow(0 ${size / 22}px ${size / 14}px rgba(0,0,0,0.35))` }}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/shrine/elements/${deity.element}.webp`}
          alt=""
          style={{ width: size * 0.62, height: size * 0.62, objectFit: 'contain' }}
          onError={(e) => {
            e.currentTarget.outerHTML = `<span style="font-size:${size * 0.4}px;line-height:1">${ELEMENT_GLYPH[deity.element] ?? '神'}</span>`
          }}
          draggable={false}
        />
      )}
    </div>
  )
}
