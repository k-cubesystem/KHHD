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
import {
  GRAND_ALTAR_BOX_H,
  GRAND_ALTAR_CODE_PREFIX,
  STAGE_BANDS,
  STAGE_FLOOR_LINE_Y,
  hasGrandAltar,
} from '@/lib/domain/shrine/theme-stage'

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
  /**
   * 이 구역이 **첫 화면**이라 벽지·바닥재를 미루면 안 된다(구역 1개짜리 세계).
   * zoned 의 지연 로드는 «뷰포트 밖 구역» 을 미루려던 것이라, 볼 구역이 하나뿐이면 손해로 뒤집힌다.
   */
  eager?: boolean
}

/** 404·로드 실패 시 조용히 숨겨 아래 폴백(그라디언트/다크 배경)이 드러나게 한다. */
function hideOnError(e: SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.display = 'none'
}

/**
 * ★ 뮤럴 규격 v3 — 「폭 맞춤(width-fit) + 접지 고정」 ★ (PLAN-stage-harmony-v1 추기 3-2)
 *
 * 종전 `object-cover`(가운데)는 «세로를 맞추고 가로를 버리는» 동작이었다. 저장본은 기준 뷰포트
 * (520×620)의 밴드 비율로 잘려 있는데(벽 4.33:1) 실기기 밴드는 3.15~3.51:1 이라, 실폰에서는
 * 세로를 맞추는 순간 **가로가 20~25% 잘려 나가고**(= 배경이 확대돼 보인다) 그만큼 원판을 더
 * 크게 늘려 쓰게 되어 화질까지 깎였다(DPR3 소요 폭 ≈3.4~4.1k px > 저장 폭 3435).
 * CEO 3차 피드백 ②③ 은 이 한 줄에서 같이 나온 증상이다.
 *
 * v3 는 «가로를 맞추고 세로를 버린다» — 다만 새 레이아웃을 만들지 않고 **object-position 한 칸**만
 * 바꾼다. `object-fit: cover` 는 «모자란 축을 채우는» 규칙이라 이미지 비가 밴드 비보다
 *   · 작으면 (v3 수출: 벽 ≤3.0 · 바닥 ≤4.6) 폭을 맞추고 세로가 넘쳐 잘린다 → **가로 크롭 0**
 *   · 크면 (구 규격 4.33 / 6.71)            세로를 맞추고 가로가 잘린다   → **지금까지의 렌더 그대로**
 * 즉 새 동작은 «세로가 남는 자산»에만 걸리고 구 자산은 한 픽셀도 달라지지 않는다(전환기 회귀 0).
 * 별도의 overflow 컨테이너를 세우지 않는 것도 의도다 — 잘라내기가 요소 상자 안에서 끝나므로
 * 「둥근 클립 + overflow-hidden」이 고DPR 실기기에서 GPU 마스크로 터지던 경로를 건드리지 않는다.
 *
 * 버리는 방향은 **접지선이 움직이지 않게** 고정한다: 벽은 아래(수평선=마루선이 밴드 바닥에 붙고
 * 여분의 헤드룸이 위로 잘림), 바닥은 위(수평선이 밴드 천장에 붙고 앞바닥이 아래로 잘림).
 * 그래서 어느 기기에서도 벽·바닥이 만나는 선은 마루선(STAGE_FLOOR_LINE_Y) 그 자리다.
 */
const MURAL_V3_SUFFIX = '-v3.webp'

/**
 * ★ 무대 기하 v4 — 밴드 %는 **theme-stage-geometry.json 단일 출처**다 (2026-08-10).
 *
 * 종전에는 `h-[62%]`·`bottom-[40%]`·`top-[60%]` 로 네 곳에 흩어져 있었다. Tailwind 임의값 클래스는
 * 문자열이 정적일 때만 생성되므로 상수로 조립할 수 없다 — 그래서 **인라인 style** 로 바꾼다
 * (동적 클래스명은 조용히 미생성되어 밴드가 통째로 사라지는 경로다).
 *
 * 마루선 y60 → **y70**(벽 72 · 바닥 30 · 겹침 2%p): 마루를 줄여 벽을 세운다.
 * 뮤럴은 width-fit 이라 구 규격 장(수평선이 60에 구워진 13테마)도 밴드만 늘어날 뿐 가로 크롭은 0 이다.
 */
const WALL_BAND: CSSProperties = { height: `${STAGE_BANDS.wall}%` }
const FLOOR_BAND: CSSProperties = { height: `${STAGE_BANDS.floor}%` }
/** CSS 폴백 블록은 겹치지 않고 마루선에서 딱 만난다(그림이 없을 때의 방 색) */
const WALL_FILL_BOX: CSSProperties = { bottom: `${STAGE_BANDS.floor}%`, background: 'var(--th-wall)' }
const FLOOR_FILL_BOX: CSSProperties = { top: `${STAGE_FLOOR_LINE_Y}%`, background: 'var(--th-floor)' }

/**
 * 렌디션 2종 — v3 뮤럴은 고해상(원판 폭)과 표준(2048px) 두 장으로 나간다.
 * **`-v3.webp` 로 끝나는 URL 은 «`-v3-sd.webp` 형제가 있다»는 계약**이다. 파일명 자체를 신호로
 * 삼아 DB 스키마도 렌더 props 도 늘리지 않고, 아직 구 규격이 남아 있는 테마에는 srcset 이
 * 아예 붙지 않게 한다 — 없는 후보를 적으면 저DPR 기기가 404 를 받고 onError 로 **뮤럴이 통째로
 * 사라진다**(전환기에 가장 비싼 사고).
 *
 * 기술자는 w 가 아니라 **x(DPR)** 로 적는다: 이 이미지의 레이아웃 폭은 언제나 «세계 폭 = 3.2화면»
 * 이라 필요 픽셀이 DPR 하나로 결정되고, sizes 로 브라우저에 알려 줄 새 정보가 없다.
 * (표준 2048px 는 DPR1 최대 소요 3.2×520=1664px 를 덮는다.)
 */
function muralSrcSet(url: string): string | undefined {
  if (!url.endsWith(MURAL_V3_SUFFIX)) return undefined
  return `${url.slice(0, -MURAL_V3_SUFFIX.length)}-v3-sd.webp 1x, ${url} 2x`
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
 * L0 벽지 — 방 상단. 하단 바닥재와 살짝 겹쳐(벽 72% + 바닥 30%) 이음새 틈을 없앤다.
 * 구역 모드(zoned)에서는 방 모서리에 붙지 않으므로 라운딩을 끄고, 뷰포트 밖 구역의 와이드 벽지를
 * 첫 페인트에 끌고 오지 않도록 지연 로드한다(ARCH §5).
 */
function Wallpaper({ url, zoned, tile, eager }: { url: string; zoned: boolean; tile: boolean; eager: boolean }) {
  if (tile) {
    return (
      <div
        aria-hidden
        className={`absolute inset-x-0 top-0 w-full pointer-events-none select-none${zoned ? '' : ' rounded-t-[17px]'}`}
        style={{ ...tileBackground(url), ...WALL_BAND }}
      />
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      srcSet={muralSrcSet(url)}
      alt=""
      aria-hidden
      draggable={false}
      decoding="async"
      loading={zoned && !eager ? 'lazy' : undefined}
      // 벽 뮤럴만 우선순위를 올린다 — 첫 화면에서 가장 큰 면적이고, 바닥재까지 같이 올리면
      // 둘이 대역폭을 나눠 가져 정작 먼저 보여야 할 벽이 늦어진다
      fetchPriority={eager ? 'high' : undefined}
      // object-bottom = 수평선(마루선)을 밴드 바닥에 붙인다 (v3 규약 — 위 주석)
      className={`absolute inset-x-0 top-0 w-full object-cover object-bottom pointer-events-none select-none${
        zoned ? '' : ' rounded-t-[17px]'
      }`}
      style={WALL_BAND}
      onError={hideOnError}
    />
  )
}

/** L1 바닥재 — 방 하단 (라운딩·지연 로드·타일 규약은 벽지와 같다) */
function Flooring({ url, zoned, tile, eager }: { url: string; zoned: boolean; tile: boolean; eager: boolean }) {
  if (tile) {
    return (
      <div
        aria-hidden
        className={`absolute inset-x-0 bottom-0 w-full pointer-events-none select-none${
          zoned ? '' : ' rounded-b-[17px]'
        }`}
        style={{ ...tileBackground(url), ...FLOOR_BAND }}
      />
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      srcSet={muralSrcSet(url)}
      alt=""
      aria-hidden
      draggable={false}
      decoding="async"
      loading={zoned && !eager ? 'lazy' : undefined}
      // object-top = 수평선을 밴드 천장에 붙인다 — 벽의 object-bottom 과 한 쌍이라 접지선이 고정된다
      className={`absolute inset-x-0 bottom-0 w-full object-cover object-top pointer-events-none select-none${
        zoned ? '' : ' rounded-b-[17px]'
      }`}
      style={FLOOR_BAND}
      onError={hideOnError}
    />
  )
}

export function StageLayers({
  stage,
  themeCode,
  slot,
  zoned = false,
  tile = false,
  widthScale = 1,
  eager = false,
}: Props) {
  if (slot === 'ground') {
    if (zoned) {
      return (
        <>
          {/* 벽·바닥 CSS 폴백 — 에셋 없는 구역(하늘만 있는 마당 등)도 구멍 없이 성립한다.
              벽지·바닥재가 있으면 그 아래 깔릴 뿐이라 보이지 않는다. */}
          <div className="absolute inset-x-0 top-0" style={WALL_FILL_BOX} />
          <div className="absolute inset-x-0 bottom-0" style={FLOOR_FILL_BOX} />
          {stage?.wallpaperUrl && (
            <Wallpaper key={`wall-${stage.wallpaperUrl}`} url={stage.wallpaperUrl} zoned tile={tile} eager={eager} />
          )}
          {stage?.flooringUrl && (
            <Flooring key={`floor-${stage.flooringUrl}`} url={stage.flooringUrl} zoned tile={tile} eager={eager} />
          )}
        </>
      )
    }
    if (!stage) {
      return (
        <>
          <div className="absolute inset-x-0 top-0 rounded-t-[17px]" style={WALL_FILL_BOX} />
          <div className="absolute inset-x-0 bottom-0 rounded-b-[17px]" style={FLOOR_FILL_BOX} />
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
          <Wallpaper
            key={`wall-${stage.wallpaperUrl}`}
            url={stage.wallpaperUrl}
            zoned={false}
            tile={tile}
            eager={eager}
          />
        )}
        {stage.flooringUrl && (
          <Flooring
            key={`floor-${stage.flooringUrl}`}
            url={stage.flooringUrl}
            zoned={false}
            tile={tile}
            eager={eager}
          />
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
  //
  // ⚠️ 예외 한 종 — 「틀(壇)」은 **세로**가 기준이다(2026-08-10 접지 수복). 사유는 theme-stage.ts
  //    GRAND_ALTAR_BOX_H 주석: 틀의 계약(감실 바닥·제물 밑변·접지)이 전부 방 y 라, 폭 기준으로 그리면
  //    방 종횡비가 바뀌는 실기기마다 접지가 접지선에서 떨어진다(390 폰 9%p). 기준 방에서는 두 규칙의
  //    결과가 같아 회귀가 없다.
  //    v5 「마루 1/3 접지」는 시드 y 만 +9 내려간 **순수 평행이동**이라 이 분기는 그대로다 —
  //    상자 세로(GRAND_ALTAR_BOX_H 71.56)도 파생식이 마루선 → 접지선으로 옮겨 갔을 뿐 값이 같다.
  const grand = hasGrandAltar(themeCode)
  return (
    <>
      {stage.structures.map((s) => {
        const byHeight = grand && s.code.startsWith(GRAND_ALTAR_CODE_PREFIX)
        const size: CSSProperties = byHeight
          ? { height: `${GRAND_ALTAR_BOX_H}%`, width: 'auto' }
          : { width: `${widthScale === 1 ? s.w : Math.round(s.w * widthScale * 1e4) / 1e4}%`, height: 'auto' }
        return (
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
              ...size,
              transform: 'translate(-50%, -50%)',
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.45))',
            }}
            onError={hideOnError}
          />
        )
      })}
    </>
  )
}
