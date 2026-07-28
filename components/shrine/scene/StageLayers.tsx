'use client'

/**
 * 무대(舞臺) 배경 레이어 — 신당 꾸미기 v2 「조립식 무대」 §3-A.
 *
 * 서버 의존 없는 순수 표현 컴포넌트. 활성 테마의 `stage` 유무로 렌더가 갈린다.
 *  - stage 있음 : L0 벽지 → L1 바닥재 → L2 구조물(제단·선반)을 조립해 그린다.
 *                 이때 레거시의 room.webp·CSS 벽/바닥 블록·CSS 제단 박스는 그리지 않는다.
 *  - stage 없음 : 레거시 렌더 그대로. 마크업·클래스·인라인 스타일을 원본에서 그대로 옮겨왔다
 *                 (테마 세대교체는 테마 단위로 진행하므로 **레거시 회귀 0** 이 제1원칙).
 *
 * paint 순서를 보존하려고 slot 으로 두 번 렌더된다:
 *  - 'ground'     신위 스탠드보다 뒤 — 벽지·바닥재 (레거시: 벽 블록·바닥 블록·room.webp)
 *  - 'structures' 하단 암전·글로우보다 앞, 신위 스탠드(z-3)보다 뒤(z-auto) — 제단 등 구조물
 */

import type { SyntheticEvent } from 'react'
import type { StageSpec } from '@/lib/domain/shrine/stage'

interface Props {
  /** 활성 테마의 무대 사양. null 이면 레거시(완성 일러스트) 렌더. */
  stage: StageSpec | null
  /** 레거시 room.webp 경로 키 (= 테마 코드) */
  themeCode: string
  slot: 'ground' | 'structures'
}

/** 404·로드 실패 시 조용히 숨겨 아래 폴백(그라디언트/다크 배경)이 드러나게 한다. */
function hideOnError(e: SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.display = 'none'
}

export function StageLayers({ stage, themeCode, slot }: Props) {
  if (slot === 'ground') {
    if (!stage) {
      return (
        <>
          <div
            className="absolute inset-x-0 top-0 bottom-[40%] rounded-t-[17px]"
            style={{ background: 'var(--th-wall)' }}
          />
          <div
            className="absolute inset-x-0 top-[60%] bottom-0 rounded-b-[17px]"
            style={{ background: 'var(--th-floor)' }}
          />
          {/* 테마 방 배경 이미지 — <img>로 렌더. 둥근 클립 제거로 GPU 마스크 실패(흰화면) 회피.
              저해상도(512w) 다운스케일 유지, 이미지 자체를 라운딩. 404 시 onError로 숨김 → 그라디언트 폴백. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={themeCode}
            src={`/shrine/themes/${themeCode}/room.webp`}
            alt=""
            aria-hidden
            draggable={false}
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none rounded-[17px]"
            onError={hideOnError}
          />
        </>
      )
    }
    return (
      <>
        {/* L0 벽지 — 방 상단. 하단 바닥재와 살짝 겹쳐(62%+40%) 이음새 틈을 없앤다.
            URL 이 없으면(부분 무대) 그리지 않고 방 배경색이 그대로 드러난다. */}
        {stage.wallpaperUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={`wall-${stage.wallpaperUrl}`}
              src={stage.wallpaperUrl}
              alt=""
              aria-hidden
              draggable={false}
              decoding="async"
              className="absolute inset-x-0 top-0 h-[62%] w-full object-cover pointer-events-none select-none rounded-t-[17px]"
              onError={hideOnError}
            />
          </>
        )}
        {/* L1 바닥재 — 방 하단 */}
        {stage.flooringUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={`floor-${stage.flooringUrl}`}
              src={stage.flooringUrl}
              alt=""
              aria-hidden
              draggable={false}
              decoding="async"
              className="absolute inset-x-0 bottom-0 h-[40%] w-full object-cover pointer-events-none select-none rounded-b-[17px]"
              onError={hideOnError}
            />
          </>
        )}
      </>
    )
  }

  // ── slot === 'structures' ──
  if (!stage) {
    // 레거시 제단 (CSS 박스) — 원본 그대로
    return (
      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: '47%', width: '62%', height: '20%' }}>
        <div
          className="absolute inset-x-0 top-0 bottom-[62%] rounded-t"
          style={{
            background: 'linear-gradient(180deg,#4a3620,#33240f)',
            border: '1px solid rgba(201,168,76,0.35)',
            borderBottom: 0,
          }}
        />
        <div
          className="absolute top-[38%] inset-x-[4%] bottom-0 rounded-b grid place-items-center"
          style={{
            background: 'linear-gradient(180deg,#2a1d0c,#1a1207)',
            border: '1px solid rgba(201,168,76,0.2)',
            borderTop: 0,
          }}
        >
          <span className="font-serif text-[13px] opacity-55" style={{ color: 'var(--th-accent)' }}>
            福
          </span>
        </div>
      </div>
    )
  }

  // L2 구조물 — x/y 는 스프라이트 **중심** 기준(%), w 는 방 너비 대비 폭(%). 높이는 원본 비율.
  return (
    <>
      {stage.structures.map((s) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={s.code}
          src={s.assetUrl}
          alt=""
          aria-hidden
          draggable={false}
          decoding="async"
          className="absolute pointer-events-none select-none"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.w}%`,
            height: 'auto',
            transform: 'translate(-50%, -50%)',
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.45))',
          }}
          onError={hideOnError}
        />
      ))}
    </>
  )
}
