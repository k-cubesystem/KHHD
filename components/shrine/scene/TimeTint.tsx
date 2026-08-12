'use client'

/**
 * 시간대 틴트 — 방이 하루를 사는 전면층 (ARCH-shrine-living-background-v1 §2 · PRD §4 L1-1).
 *
 * 조명 오버레이(soft-light 1장)가 이미 "아래 전부를 물들이는" 자리(z29)에 있다. 그 **바로 다음 형제**로
 * 위상 틴트를 일반 알파로 겹치고 opacity 만 크로스페이드한다 — 신규 blend-mode 를 만들지 않는다
 * (대면적 블렌드 실측 사고 전례).
 *
 * 이 컴포넌트가 스스로 정하는 것은 «어느 레이어를 몇 % 로 띄우는가» 뿐이다. 위상 판정은
 * theme-ambient.tintOpacities → scene-clock.phaseWeights 하나로 흐른다 — 경계를 두 번 구현하면
 * 조명과 틴트가 서로 다른 시각을 산다.
 *
 * ⚠️ opacity 0 인 층은 DOM 에서 뺀다. 전면 승격 레이어는 상시 최대 2장이 예산이다(@DPR3 전면 1장 ≈12MB).
 * ⚠️ 그라디언트는 CSS 고정값이다 — 인라인 그라디언트·변수 보간 금지(레이어마다 재래스터가 난다).
 */

import { tintOpacities, type TintProfile } from '@/lib/domain/shrine/theme-ambient'

/** 조명 오버레이와 같은 층. DOM 순서로 그 위에 얹히고 룸 UI(z30) 아래에 남는다. */
const TINT_Z = 29

/**
 * 시간순으로 적는다(새벽→낮→해질녘→밤). 동시에 뜨는 층은 언제나 최대 2 장이라
 * (tintOpacities 계약) 겹침 순서가 화면을 바꾸지 않지만, 읽는 사람의 시간 감각과 DOM 순서를 맞춰 둔다.
 *
 * ⚠️ 'day' 는 어둡히는 층이 아니라 **주광 가산**층이다 — 밤 원판 테마(달집·별밭·연등·도깨비)와
 *    무시간 원판(용궁)이 «낮에 밝아지는» 역방향으로 하루를 사는 유일한 경로다. 이 줄을 지우면
 *    그 다섯 방은 다시 하루 종일 정지한다(v1 실측 ΔL* 최대 0.9).
 */
const TINT_LAYERS = [
  { phase: 'dawn', className: 'shrine-tint-dawn' },
  { phase: 'day', className: 'shrine-tint-day' },
  { phase: 'dusk', className: 'shrine-tint-dusk' },
  { phase: 'night', className: 'shrine-tint-night' },
] as const

interface Props {
  /** KST 시각 0~24. null = 마운트 전 — 아무것도 그리지 않는다(SSR·클라 첫 렌더 동일, #418 전례) */
  hour: number | null
  /** 테마 틴트 프로파일. null = 스펙 없는 테마 = 틴트 없음(그 방은 지금까지의 화면 그대로) */
  profile: TintProfile | null
  /** 방 모서리 라운딩 클래스 — **선행 공백 포함** 문자열(단일 무대에서만 값이 있다) */
  roundClassName?: string
}

export function TimeTint({ hour, profile, roundClassName = '' }: Props) {
  if (hour === null || profile === null) return null
  const opacity = tintOpacities(hour, profile)
  return (
    <>
      {TINT_LAYERS.map((layer) =>
        opacity[layer.phase] > 0 ? (
          <div
            key={layer.phase}
            aria-hidden
            className={`absolute inset-0 pointer-events-none ${layer.className}${roundClassName}`}
            style={{ opacity: opacity[layer.phase], zIndex: TINT_Z }}
          />
        ) : null
      )}
    </>
  )
}
