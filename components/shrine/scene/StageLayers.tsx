'use client'

/**
 * 무대(舞臺) 배경 레이어 — 신당 꾸미기 v2 「조립식 무대」 §3-A + 게임필 2차 두루마리 구역(ARCH §1).
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
 *
 * `zoned` 는 두루마리 구역(마당·대청·후원) 안에서 쓰는 모드다. 방 모서리에 붙지 않으므로
 * 라운딩을 끄고, 에셋이 없는 구역도 구멍이 나지 않게 벽·바닥 CSS 폴백을 항상 깐다.
 *
 * 뷰포트보다 넓은 구역(안2.1 「큰 방 하나」)에서는 두 가지가 더 붙는다 —
 * `tile`(벽지·바닥을 늘리지 않고 가로 반복)과 `widthScale`(구조물 겉보기 폭 유지).
 * 둘 다 기본값이 지금까지의 렌더라 기존 테마·레거시는 그대로다.
 */

import type { CSSProperties, SyntheticEvent } from 'react'
import type { StageSpec } from '@/lib/domain/shrine/stage'

interface Props {
  /** 활성 테마의 무대 사양. null 이면 레거시(완성 일러스트) 렌더. */
  stage: StageSpec | null
  /** 레거시 room.webp 경로 키 (= 테마 코드) */
  themeCode: string
  slot: 'ground' | 'structures'
  /** 두루마리 구역 안에서의 렌더 (라운딩 끔 + 벽·바닥 CSS 폴백) */
  zoned?: boolean
  /**
   * 벽지·바닥을 늘리지 않고 **가로로 반복**한다 (WorldZone.tile — 안2.1 「큰 방 하나」).
   * 뷰포트보다 넓은 구역에서 한 장을 늘리면 벽 리듬이 폭 배수만큼 뭉개진다.
   */
  tile?: boolean
  /**
   * 구조물 `w` 겉보기 보정 계수 (world-render `zoneWidthScale` 단일 출처).
   * w 는 구역 폭 대비 % 라 구역이 넓어지면 같이 커진다 — 기본 1 은 지금까지의 렌더 그대로다.
   */
  widthScale?: number
}

/** 404·로드 실패 시 조용히 숨겨 아래 폴백(그라디언트/다크 배경)이 드러나게 한다. */
function hideOnError(e: SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.display = 'none'
}

/**
 * 가로 타일 배경 — 원본 높이를 밴드에 맞추고(auto 100%) x 축으로만 반복한다.
 * <img> 가 아니라 background 라 onError 훅이 없지만, 404 면 아무것도 안 그려져
 * 구역 모드가 항상 깔아 두는 CSS 폴백색(--th-wall/--th-floor)이 그대로 드러난다.
 * URL 은 stage.ts 파싱에서 공백·따옴표·괄호가 이미 배제된 값이다.
 */
function tileBackground(url: string): CSSProperties {
  return {
    backgroundImage: `url("${url}")`,
    backgroundRepeat: 'repeat-x',
    backgroundSize: 'auto 100%',
  }
}

/**
 * L0 벽지 — 방 상단. 하단 바닥재와 살짝 겹쳐(62%+40%) 이음새 틈을 없앤다.
 * 구역 모드(zoned)에서는 방 모서리에 붙지 않으므로 라운딩을 끄고, 뷰포트 밖 구역의 와이드 벽지를
 * 첫 페인트에 끌고 오지 않도록 지연 로드한다(ARCH §5).
 */
function Wallpaper({ url, zoned, tile }: { url: string; zoned: boolean; tile: boolean }) {
  if (tile) {
    return (
      <div
        aria-hidden
        className={`absolute inset-x-0 top-0 h-[62%] w-full pointer-events-none select-none${
          zoned ? '' : ' rounded-t-[17px]'
        }`}
        style={tileBackground(url)}
      />
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      aria-hidden
      draggable={false}
      decoding="async"
      loading={zoned ? 'lazy' : undefined}
      className={`absolute inset-x-0 top-0 h-[62%] w-full object-cover pointer-events-none select-none${
        zoned ? '' : ' rounded-t-[17px]'
      }`}
      onError={hideOnError}
    />
  )
}

/** L1 바닥재 — 방 하단 (라운딩·지연 로드·타일 규약은 벽지와 같다) */
function Flooring({ url, zoned, tile }: { url: string; zoned: boolean; tile: boolean }) {
  if (tile) {
    return (
      <div
        aria-hidden
        className={`absolute inset-x-0 bottom-0 h-[40%] w-full pointer-events-none select-none${
          zoned ? '' : ' rounded-b-[17px]'
        }`}
        style={tileBackground(url)}
      />
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      aria-hidden
      draggable={false}
      decoding="async"
      loading={zoned ? 'lazy' : undefined}
      className={`absolute inset-x-0 bottom-0 h-[40%] w-full object-cover pointer-events-none select-none${
        zoned ? '' : ' rounded-b-[17px]'
      }`}
      onError={hideOnError}
    />
  )
}

export function StageLayers({ stage, themeCode, slot, zoned = false, tile = false, widthScale = 1 }: Props) {
  if (slot === 'ground') {
    if (zoned) {
      return (
        <>
          {/* 벽·바닥 CSS 폴백 — 에셋 없는 구역(하늘만 있는 마당 등)도 구멍 없이 성립한다.
              벽지·바닥재가 있으면 그 아래 깔릴 뿐이라 보이지 않는다. */}
          <div className="absolute inset-x-0 top-0 bottom-[40%]" style={{ background: 'var(--th-wall)' }} />
          <div className="absolute inset-x-0 top-[60%] bottom-0" style={{ background: 'var(--th-floor)' }} />
          {stage?.wallpaperUrl && (
            <Wallpaper key={`wall-${stage.wallpaperUrl}`} url={stage.wallpaperUrl} zoned tile={tile} />
          )}
          {stage?.flooringUrl && (
            <Flooring key={`floor-${stage.flooringUrl}`} url={stage.flooringUrl} zoned tile={tile} />
          )}
        </>
      )
    }
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
        {/* URL 이 없으면(부분 무대) 그리지 않고 방 배경색이 그대로 드러난다. */}
        {stage.wallpaperUrl && (
          <Wallpaper key={`wall-${stage.wallpaperUrl}`} url={stage.wallpaperUrl} zoned={false} tile={tile} />
        )}
        {stage.flooringUrl && (
          <Flooring key={`floor-${stage.flooringUrl}`} url={stage.flooringUrl} zoned={false} tile={tile} />
        )}
      </>
    )
  }

  // ── slot === 'structures' ──
  if (!stage) {
    // 두루마리 구역에는 레거시 CSS 제단을 세우지 않는다 (구역은 stage 계약 위에서만 산다)
    if (zoned) return <></>
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

  // L2 구조물 — x/y 는 스프라이트 **중심** 기준(%), w 는 구역 너비 대비 폭(%). 높이는 원본 비율.
  // x/y 는 "구역 어디쯤"이라는 비율 위치라 넓은 구역에서도 그대로 두고(제단이 방 한가운데로 간다),
  // 크기인 w 만 widthScale 로 겉보기를 지킨다. 등배(1)면 곱셈 결과가 원값이라 DOM 이 한 글자도 안 바뀐다.
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
            width: `${widthScale === 1 ? s.w : Math.round(s.w * widthScale * 1e4) / 1e4}%`,
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
