'use client'

import { prayerBoardBox, type FamilyPrayer } from '@/lib/domain/shrine/family-prayer'

/**
 * 기도 액자(祈禱 額子) — **왼쪽 상단 문틀 위**에 걸리는 긴 액자 한 장 (백일기도 v3.2).
 *
 * 🔴 자리는 세계(stageContent) 좌표다 — 그 벽에 걸린 물건이라 카메라를 팬하면 벽과 함께
 *    흘러간다. v3.1 의 «방 뷰포트 고정(상단 중앙)»은 CEO 반려(「원래 왼쪽 상단 문틀이 맞아」).
 *    마운트는 stageContent 안이어야 한다 — 방 직속에 걸면 HUD 가 된다.
 *
 * 🔴 **한 편만 걸린다.** v2 의 «여러 편이 7.5초마다 번갈아 뜨는» 자동 순환은 CEO 3차 지시로
 *    걷어 냈다(«랜덤으로 나오는 건 없애줘»). 되살리지 말 것 — 벽에 걸린 글이 저 혼자 바뀌면
 *    «내가 건 글»이 아니게 된다. 어느 편을 거는지는 **사람이 목록에서 고른다**(PrayerList).
 *    고르지 않았으면 최신 기도가 걸린다(도메인 selectBoardPrayer 판정 — 여기서 고르지 않는다).
 *
 * 🔴 판면은 **한지색**, 글씨는 **먹빛**이다(구 먹빛 판면 + 금글씨는 2차에서 반려).
 *    어두운 방에서 벽에 걸린 한지가 스스로 밝은 것이 이 물건의 정체다.
 * 🔴 네 귀 «ㄱ자 금쇠(장석)»는 3차 지시로 걷어 냈다 — 되살리지 말 것.
 *
 * 격은 재료로 낸다: 자단(紫檀) 목틀 + 뇌문(雷紋) 금실 무늬 띠 + 이중 금선 + 한지 판면 +
 * 먹글씨 + 낙관(대상 이름 도장). 자산 0 — 전부 CSS 그라디언트다.
 *
 * 연출 규율: transform/opacity 만. 새 keyframes 금지(styled-jsx·CSS 게이트 전례).
 * 표시 전용이라 **누를 수 없다**(div) — 아무 일도 안 하는 버튼을 벽에 걸지 않는다.
 */

/**
 * 뇌문(雷紋) 무늬 띠 — 목틀 안쪽을 두르는 금실 격자. 전통 단청·나전의 번개무늬 근사다.
 * 45°/-45° 얇은 금선을 교차시켜 «짜인» 결을 만든다(이미지 자산 0).
 */
const FRET_PATTERN =
  'repeating-linear-gradient(45deg, rgba(201,168,76,0.30) 0 1px, transparent 1px 6px),' +
  'repeating-linear-gradient(-45deg, rgba(201,168,76,0.22) 0 1px, transparent 1px 6px)'

export function PrayerBoard({ prayer, wide }: { prayer: FamilyPrayer | null; wide: boolean }) {
  if (!prayer) return null
  const box = prayerBoardBox(wide)

  return (
    <div
      role="img"
      aria-label={`신당 벽에 걸린 기도 — ${prayer.name}: ${prayer.text}`}
      className="absolute select-none"
      style={{
        left: `${box.x - box.w / 2}%`,
        top: `${box.top}%`,
        width: `${box.w}%`,
        height: `${box.h}%`,
        zIndex: 9,
      }}
    >
      {/* 매듭끈 두 가닥 — 액자가 들보에 매여 있음을 말한다(위로 갈수록 사라진다) */}
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

      {/* 기도문 — 한 편. 최대 40자라 말줄임 없이 전문이 걸린다 */}
      <span className="absolute grid place-items-center" style={{ inset: '14% 8.5%' }}>
        <span
          className="w-full text-center font-serif font-bold leading-[1.5]"
          style={{
            // 먹빛 — 한지 위의 글씨는 붓으로 쓴 먹이다(금글씨는 3차 반려)
            color: '#2E2114',
            fontSize: 'clamp(11px, 3.4vw, 15px)',
            letterSpacing: '0.04em',
            wordBreak: 'keep-all',
            textShadow: '0 1px 0 rgba(255,250,235,0.55)',
          }}
        >
          {prayer.text}
        </span>
      </span>

      {/* 낙관(落款) — 기도 대상의 이름 도장. 장이 갈리면 도장도 함께 갈린다 */}
      <span
        className="absolute grid place-items-center rounded-[2px] font-serif font-bold"
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
        {prayer.name}
      </span>
    </div>
  )
}
