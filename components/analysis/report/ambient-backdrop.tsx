import Image from 'next/image'
import { cn } from '@/lib/utils'
import { BLUR_DATA_URL } from '@/lib/utils/image'

/**
 * 결과 화면 뒤에 «살짝 뿌리는» 실사 앰비언스 레이어.
 *
 * 표현 전용이다 — 상태도 없고 이벤트도 안 받는다. 배치(위치·높이)는 부모가 정하고,
 * 이 컴포넌트는 그 안을 채우는 absolute 레이어 하나만 만든다.
 *
 * 🔴 가독성이 먼저다. 이미지는 반드시 배경색 그라디언트 마스크에 잠긴 채로만 보인다 —
 *    variant 별 실효 불투명도는 아래 표 참고. 마스크 없이 쓰지 말 것.
 * 🔴 이미지는 `scripts/media-assets/generate-analysis-ambient.mjs` 의 산출물이다.
 *    키를 바꾸면 그 스크립트의 AMBIENT_SPECS id 도 같이 바꿔야 한다.
 */
const AMBIENT_SOURCES = {
  /** 깊은 밤 한옥 서재 — 벼루·붓·촛불(세로) */
  study: '/images/analysis/ambient-study.webp',
  /** 향로에서 오르는 연기 한 줄기(가로) */
  incense: '/images/analysis/ambient-incense.webp',
  /** 밤하늘 아래 기와 처마 실루엣(세로) */
  roof: '/images/analysis/ambient-roof.webp',
} as const

export type AmbientBackdropId = keyof typeof AMBIENT_SOURCES

/**
 * 배치별 «이미지 불투명도 + 마스크» 묶음. 둘은 따로 놀면 안 되므로 한 덩어리로 고정한다
 * (마스크만 약하게 바꿔 글자 뒤가 밝아지는 사고를 구조적으로 막는다).
 *
 * | variant | 이미지 | 마스크가 남기는 최대 노출 |
 * | ------- | ------ | ------------------------- |
 * | header  | 0.18   | 상단 ≈0.11 → 하단 0       |
 * | band    | 0.30   | 중앙 ≈0.15 → 양끝 0       |
 * | screen  | 0.14   | 상단 ≈0.06 → 하단 0       |
 */
const VARIANTS = {
  /** 결과 헤더·리포트 카드 뒤 — 위에서 시작해 아래로 배경색에 완전히 잠긴다. */
  header: {
    image: 'opacity-[0.18]',
    mask: 'bg-gradient-to-b from-background/40 via-background/80 to-background',
  },
  /** 섹션 사이 얇은 비주얼 브레이크 — 위아래 양끝이 잠기고 가운데만 남는다. */
  band: {
    image: 'opacity-[0.3]',
    mask: 'bg-gradient-to-b from-background via-background/50 to-background',
  },
  /** 화면 전체 뒤(로딩) — 글자가 화면 전역에 있으므로 가장 얕게 깐다. */
  screen: {
    image: 'opacity-[0.14]',
    mask: 'bg-gradient-to-b from-background/60 via-background/75 to-background',
  },
} as const

export type AmbientBackdropVariant = keyof typeof VARIANTS

interface AmbientBackdropProps {
  id: AmbientBackdropId
  /** 기본 header. 배치에 맞는 불투명도·마스크 묶음을 고른다. */
  variant?: AmbientBackdropVariant
  /** 부모 안에서의 위치·높이 보정(기본은 inset-0 전체). */
  className?: string
  /** 첫 화면(헤더)처럼 즉시 보여야 하는 자리만 true. 기본은 lazy. */
  eager?: boolean
}

export function AmbientBackdrop({ id, variant = 'header', className, eager = false }: AmbientBackdropProps) {
  const { image, mask } = VARIANTS[variant]

  // 🔴 isolate 필수 — .hanji-overlay 가 z-index:10 · mix-blend-mode:overlay 다.
  //    스택 문맥을 여기서 끊지 않으면 그 질감이 본문 글자 위로 올라온다.
  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none select-none absolute inset-0 isolate overflow-hidden', className)}
    >
      <Image
        src={AMBIENT_SOURCES[id]}
        alt=""
        fill
        // 🔴 quality 를 지정하지 않는다 — Next 16 은 next.config 의 images.qualities(기본 [75])에
        //    없는 값을 거부한다. 원본이 이미 8~20KB 라 낮출 실익도 없다.
        sizes="480px"
        placeholder="blur"
        blurDataURL={BLUR_DATA_URL}
        {...(eager ? { priority: true } : { loading: 'lazy' as const })}
        className={cn('object-cover object-center', image)}
      />
      <div className={cn('absolute inset-0', mask)} />
      <div className="hanji-overlay" />
    </div>
  )
}
