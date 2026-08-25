'use client'

import { useEffect, useMemo, useState } from 'react'
import { orderPrayersForBoard, prayerBoardBox, type FamilyPrayer } from '@/lib/domain/shrine/family-prayer'

/**
 * 기도 현판(祈禱 懸板) — 벽 상단, 금줄 위 빈 띠에 걸리는 **한 장의 긴 액자** (백일기도 v2 · 2차).
 *
 * 1차(선반별 소형 액자)는 CEO 실기기 검수에서 반려됐다 — «상단에, 끈 위쪽 빈 벽에, 길게.
 * 프레임은 더 고급스럽게». 그래서:
 *  · 자리는 도메인 상수(prayerBoardBox) 하나 — 유닛과 무관하다.
 *  · 여러 기도는 현판 한 장 안에서 **갈아든다**(7.5초 교차 페이드 · opacity 만 — 연출 규율).
 *    모션 최소화 설정이면 자동 전환을 끄고 탭으로만 넘긴다.
 *  · 격은 재료로 낸다: 자단(紫檀) 목틀 + **뇌문(雷紋) 금실 무늬 띠** + 이중 금선 + 한지 판면 +
 *    먹글씨 + 낙관(대상 이름 도장). 자산 0 — 전부 CSS 그라디언트다.
 *
 * 🔴 네 귀 «ㄱ자 금쇠(장석)»는 CEO 2026-08-25 3차 지시로 걷어 냈다 — 되살리지 말 것.
 * 🔴 판면은 **한지색**이고 글씨는 **먹빛**이다(구 먹빛 판면 + 금글씨는 반려). 어두운 방에서
 *    벽에 걸린 한지가 스스로 밝은 것이 이 물건의 정체다.
 *
 * 연출 규율: transform/opacity 만. 새 keyframes 금지(styled-jsx·CSS 게이트 전례).
 */

const CYCLE_MS = 7500

/**
 * 뇌문(雷紋) 무늬 띠 — 목틀 안쪽을 두르는 금실 격자. 전통 단청·나전의 번개무늬 근사다.
 * 45°/-45° 얇은 금선을 교차시켜 «짜인» 결을 만든다(이미지 자산 0).
 */
const FRET_PATTERN =
  'repeating-linear-gradient(45deg, rgba(201,168,76,0.30) 0 1px, transparent 1px 6px),' +
  'repeating-linear-gradient(-45deg, rgba(201,168,76,0.22) 0 1px, transparent 1px 6px)'

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

export function PrayerBoard({ prayers, wide }: { prayers: readonly FamilyPrayer[]; wide: boolean }) {
  const pages = useMemo(() => orderPrayersForBoard(prayers), [prayers])
  const [idx, setIdx] = useState(0)

  // 자동 전환 — 두 장 이상일 때만. 모션 최소화면 손으로만 넘긴다(깜빡이는 벽은 소음이다).
  useEffect(() => {
    if (pages.length < 2 || prefersReducedMotion()) return
    const t = setInterval(() => setIdx((i) => (i + 1) % pages.length), CYCLE_MS)
    return () => clearInterval(t)
  }, [pages.length])

  // 기도가 갈리면(새 기도 올림) 첫 장 — 방금 쓴 글이 바로 걸려야 인과가 보인다.
  // effect 가 아니라 렌더 중 조정(React 공식 «props 변화에 state 맞추기» 패턴 — 연쇄 렌더 없음).
  const [seenLen, setSeenLen] = useState(pages.length)
  if (seenLen !== pages.length) {
    setSeenLen(pages.length)
    setIdx(0)
  }

  if (pages.length === 0) return null
  const box = prayerBoardBox(wide)
  const current = pages[Math.min(idx, pages.length - 1)]

  return (
    <button
      type="button"
      aria-label={`가족 기도 현판 — ${current.name}: ${current.text}`}
      onClick={() => pages.length > 1 && setIdx((i) => (i + 1) % pages.length)}
      className="absolute select-none"
      style={{
        left: `${box.x - box.w / 2}%`,
        top: `${box.top}%`,
        width: `${box.w}%`,
        height: `${box.h}%`,
        zIndex: 9,
        cursor: pages.length > 1 ? 'pointer' : 'default',
      }}
    >
      {/* 매듭끈 두 가닥 — 현판이 들보에 매여 있음을 말한다(위로 갈수록 사라진다) */}
      {[18, 82].map((x) => (
        <span
          key={x}
          aria-hidden
          className="absolute bottom-full"
          style={{
            left: `${x}%`,
            width: '2px',
            height: '46%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(to top, rgba(138,47,43,0.85), rgba(138,47,43,0))',
          }}
        />
      ))}

      {/* 자단 목틀 — 결이 도는 짙은 나무. 바깥 금선 한 줄이 벽에서 액자를 떼어 낸다 */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-[5px]"
        style={{
          background:
            'repeating-linear-gradient(92deg, rgba(0,0,0,0.16) 0 1px, transparent 1px 5px),' +
            'linear-gradient(172deg, #6b4a2a 0%, #4a3218 45%, #2c1d0f 100%)',
          boxShadow:
            '0 6px 18px rgba(0,0,0,0.7), 0 1px 3px rgba(0,0,0,0.5), inset 0 1px 0 rgba(232,213,160,0.30), inset 0 0 0 1px rgba(201,168,76,0.45)',
        }}
      />

      {/* 뇌문 무늬 띠 — 목틀 안쪽을 두르는 금실 격자(액자의 «격»을 내는 자리) */}
      <span
        aria-hidden
        className="absolute rounded-[4px]"
        style={{
          inset: '4.5% 1.8%',
          backgroundImage: FRET_PATTERN,
          border: '1px solid rgba(201,168,76,0.45)',
        }}
      />

      {/* 이중 금선 안틀 — 무늬 띠와 한지 사이의 마감선 */}
      <span
        aria-hidden
        className="absolute rounded-[3px]"
        style={{
          inset: '11% 3.6%',
          border: '1px solid rgba(201,168,76,0.65)',
          boxShadow: '0 0 6px rgba(201,168,76,0.25)',
        }}
      />

      {/* 한지 판면 — 따뜻한 미색 종이. 섬유결(가로 결)과 가장자리 그을림을 얹는다 */}
      <span
        aria-hidden
        className="absolute overflow-hidden rounded-[2px]"
        style={{
          inset: '14% 5%',
          background:
            'repeating-linear-gradient(0deg, rgba(150,120,70,0.05) 0 1px, transparent 1px 3px),' +
            'radial-gradient(120% 140% at 50% 0%, rgba(255,250,235,0.85) 0%, rgba(240,228,200,0) 60%),' +
            'linear-gradient(168deg, #F3E8CE 0%, #E7D8B4 55%, #DCCBA3 100%)',
          boxShadow: 'inset 0 0 12px rgba(120,92,48,0.28), inset 0 0 0 1px rgba(120,92,48,0.18)',
        }}
      />

      {/* 기도문 — 갈아드는 장들(교차 페이드). 최대 40자라 말줄임 없이 다 걸린다. */}
      <span className="absolute grid place-items-center" style={{ inset: '14% 8.5%' }}>
        {pages.map((p, i) => (
          <span
            key={`${p.memberId ?? 'self'}-${p.createdAt}`}
            className="col-start-1 row-start-1 w-full text-center font-serif font-bold leading-[1.5] transition-opacity duration-700 ease-in-out"
            style={{
              opacity: i === idx ? 1 : 0,
              // 먹빛 — 한지 위의 글씨는 붓으로 쓴 먹이다(금글씨는 3차 반려)
              color: '#2E2114',
              fontSize: 'clamp(11px, 3.4vw, 15px)',
              letterSpacing: '0.04em',
              wordBreak: 'keep-all',
              textShadow: '0 1px 0 rgba(255,250,235,0.55)',
            }}
          >
            {p.text}
          </span>
        ))}
      </span>

      {/* 낙관(落款) — 기도 대상의 이름 도장. 장이 갈리면 도장도 함께 갈린다 */}
      <span
        className="absolute grid place-items-center rounded-[2px] font-serif font-bold transition-opacity duration-700"
        style={{
          right: '6.5%',
          bottom: '18%',
          padding: '1px 4px',
          fontSize: 'clamp(8px, 2.2vw, 10px)',
          transform: 'rotate(-2.5deg)',
          background: 'linear-gradient(160deg, #a63530 0%, #7e211f 100%)',
          color: '#F4E4BA',
          boxShadow: '0 1px 3px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(244,228,186,0.35)',
        }}
      >
        {current.name}
      </span>

      {/* 장 표시점 — 두 장 이상일 때만, 아주 작게 */}
      {pages.length > 1 && (
        <span aria-hidden className="absolute inset-x-0 flex justify-center gap-[5px]" style={{ bottom: '5.5%' }}>
          {pages.map((_, i) => (
            <span
              key={i}
              className="rounded-full transition-opacity duration-500"
              style={{
                width: '3px',
                height: '3px',
                // 한지 위가 아니라 목틀 위에 앉는 점이라 금색 그대로가 맞다
                background: '#E8D5A0',
                opacity: i === idx ? 0.95 : 0.3,
              }}
            />
          ))}
        </span>
      )}
    </button>
  )
}
