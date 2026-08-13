'use client'

import { useState } from 'react'
import {
  isFreeTheme,
  themeCostLabel,
  themeFallbackImage,
  themeThumbnail,
  type ThemeFortune,
} from '@/lib/domain/theme-fortune/themes'

/**
 * 테마 썸네일 — 허브 리스트 행과 목록 카드가 **같은 그림**을 쓰는 단 하나의 자리.
 *
 * ## 🔴 깨진 그림을 절대 내보내지 않는다
 * 실사 썸네일(`/images/theme-thumbs/{id}-v1.webp`)은 자산 작업이 따로 돌고 있어 **파일이 아직
 * 없을 수 있다.** 그래서 이 컴포넌트는 «사진이 있으면 보여준다»가 아니라 **폴백을 먼저 깔고
 * 그 위에 사진을 덮는** 구조다.
 *
 *   [바탕 판(그라디언트) → 카테고리 그림 → (있으면) 실사 사진 → 스크림 → 배지]
 *
 * 파일이 없으면 `onError` 로 사진 층만 내려가고 아래 두 층이 그대로 남는다 — 지금 라이브 화면과
 * 같은 모습이다. 즉 **자산이 도착하면 그림이 바뀌고, 안 와도 화면은 멀쩡하다.** 이 성질 때문에
 * 테마 표에는 파일 실재 테스트를 걸지 않는다(걸면 자산 도착 전 CI 가 깨진다).
 *
 * ## 왜 `next/image` 가 아닌가
 * ① 이 화면의 다른 그림(허브 런처·구 카드)이 전부 `<img>` 다 ② 없는 파일을 최적화기에 물리면
 * 폴백이 아니라 400 이 뜬다 — 폴백이 이 컴포넌트의 존재 이유인데 그걸 잃는다.
 * lazy 는 `loading` 속성으로 직접 건다(열 줄이 한꺼번에 내려오지 않게).
 */
interface ThemeThumbnailProps {
  readonly theme: ThemeFortune
  /** 첫 화면에 이미 보이는 자리만 즉시 받는다. 나머지는 스크롤할 때. */
  readonly eager?: boolean
  /** 복채 배지를 그림 위 우하단에 얹는다(유튜브의 재생시간 자리). 표기는 실차감과 같은 경로다. */
  readonly showCost?: boolean
  /** 크기·모서리는 부르는 쪽이 정한다 — 이 컴포넌트는 «무엇을 그리는가»만 안다. */
  readonly className?: string
}

export function ThemeThumbnail({ theme, eager = false, showCost = false, className = '' }: ThemeThumbnailProps) {
  const photo = themeThumbnail(theme)
  const [photoBroken, setPhotoBroken] = useState(false)
  const showPhoto = photo !== undefined && !photoBroken

  return (
    <div className={`relative overflow-hidden bg-surface ${className}`}>
      {/* 바탕 — 사진이 없어도 «빈 회색 네모»로 보이지 않게 하는 층. */}
      <div className="absolute inset-0 bg-gradient-to-br from-gold-500/[0.12] via-transparent to-black/40" />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={themeFallbackImage(theme)}
        alt=""
        aria-hidden="true"
        draggable={false}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className="absolute left-1/2 top-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2 object-contain opacity-40"
      />

      {showPhoto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo}
          alt=""
          aria-hidden="true"
          draggable={false}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setPhotoBroken(true)}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
        />
      )}

      {/* 배지가 밝은 사진 위에서도 읽히도록 아래쪽만 어둡게. */}
      {showCost && <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />}

      {showCost && (
        <span
          className={`absolute bottom-1 right-1 rounded bg-black/70 px-1 py-px text-[9px] font-medium ${
            isFreeTheme(theme) ? 'text-emerald-300' : 'text-gold-300'
          }`}
        >
          {themeCostLabel(theme)}
        </span>
      )}
    </div>
  )
}
