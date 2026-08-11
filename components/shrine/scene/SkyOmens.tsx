'use client'

/**
 * 「달과 절기」 P3 표시층 (ARCH-shrine-living-background-v1 §4 L2 · PRD §4 L2).
 *
 * 두 겹뿐이다 — 달빛(月光)과 절기 현판. 판정(달 위상·절기 창)은 도메인(lunar.ts·seasonal.ts)이
 * 이미 끝냈고, 절기의 «공기»는 앰비언트 가산 겹(theme-ambient.withSeasonal)이 AmbientBackdrop
 * 으로 흘러가므로 여기서 다시 그리지 않는다.
 *
 * ⚠️ 달을 원반으로 그리지 않는 근거는 theme-ambient.ts 「P3 달과 절기」 절에 있다(16테마 뮤럴
 *    전수 육안 판정 — 전부 실내이고, 뮤럴 세로 크롭량이 기기마다 13%p 어긋난다).
 * ⚠️ 두 겹 다 **비배치·pointer-events:none** 이고 래퍼를 만들지 않는다(형제 노드 삽입) —
 *    Sprite 드래그가 parentElement 를 기준 삼기 때문에 중간 래퍼는 배치 좌표를 통째로 어긋나게 한다.
 * ⚠️ 상시 애니를 두지 않는다. 달빛은 전면 대면적 층이라 애니를 걸면 합성 비용이 상시로 붙는다 —
 *    시간대 틴트와 같은 규약으로 opacity transition 만 쓴다(그래서 anim-audit 목록에도 없다).
 */

import type { SeasonalEventKey } from '@/lib/domain/shrine/seasonal'

/** 조명 오버레이·시간대 틴트와 같은 층. DOM 순서로 그 위에 얹히고 룸 UI(z30) 아래에 남는다. */
const MOONLIGHT_Z = 29
/** 절기 현판은 그레이딩을 **받아야** 방 안의 것으로 읽힌다 — 조명·틴트(29)보다 아래에 둔다. */
const SEASONAL_MARK_Z = 28

interface MoonlightProps {
  /** theme-ambient.moonlightOpacity() 결과 0~1. 0 이면 아무것도 그리지 않는다(낮 = 원화 그대로) */
  opacity: number
  /** 방 모서리 라운딩 클래스 — **선행 공백 포함** 문자열 */
  roundClassName?: string
}

/**
 * 달빛 한 겹 — 위에서 비껴드는 냉광. 위상이 찰수록 짙어지고 그믐엔 DOM 에서 사라진다.
 * 그라디언트는 CSS 고정값이다(인라인 그라디언트는 값이 바뀔 때마다 전면 레이어를 재래스터한다).
 */
export function Moonlight({ opacity, roundClassName = '' }: MoonlightProps) {
  if (!(opacity > 0)) return null
  return (
    <div
      aria-hidden
      className={`absolute inset-0 pointer-events-none shrine-moonlight${roundClassName}`}
      style={{ opacity, zIndex: MOONLIGHT_Z }}
    />
  )
}

interface SeasonalMarkProps {
  /** 열려 있는 절기. null 이면 미렌더 — 1년에 15일만 존재하는 층이다 */
  event: { key: SeasonalEventKey; label: string } | null
}

/**
 * 절기 현판 — 「오늘이 무슨 날인가」를 방 안에서 읽히게 하는 한 줄.
 *
 * 이게 없으면 절기 연출은 «공기가 조금 달라졌다» 뿐이라 검수자가 무엇을 보고 있는지 알 수 없다
 * (절기 창이 1년에 3일뿐이라 두 번 볼 기회도 없다). 판매·전환 요소는 일절 없다 — 글자 한 줄이다.
 */
export function SeasonalMark({ event }: SeasonalMarkProps) {
  if (!event) return null
  return (
    // 자리는 «방 위쪽 가운데» — 대청 정렬점(zoneAlignCamX)이 구역 중앙이라 쉴 때의 화면 중앙과 같고,
    // 팬하면 방과 함께 흐른다(HUD 가 아니라 방에 걸린 현판으로 읽히게 하는 것이 의도).
    // 세로 96px 는 이미 자리를 쓰는 룸 HUD 를 피한 값이다 — 미니맵(26~70)·팬 코치마크(52~80) 아래.
    <div
      className="absolute inset-x-0 top-[96px] flex justify-center pointer-events-none select-none"
      style={{ zIndex: SEASONAL_MARK_Z }}
    >
      <span
        className="px-2.5 py-[3px] rounded-full font-serif text-[10.5px] tracking-[0.28em]"
        style={{
          color: '#E8D5A0',
          background: 'rgba(10,8,4,0.42)',
          border: '1px solid rgba(201,168,76,0.38)',
        }}
      >
        {event.label}
      </span>
    </div>
  )
}
