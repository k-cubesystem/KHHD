'use client'

/**
 * AmbientVideo — 1회 생성 에셋(public/videos/{id}.webm|.mp4)을 은은한 배경 루프로 재생.
 *
 * 안전 우선(영상이 없어도 깨지지 않음):
 *  - 파일 존재를 HEAD 로 확인 → 없으면(404) fallback 렌더(기본 null = 기존 canvas/CSS 연출 유지).
 *  - prefers-reduced-motion → 정적 포스터(있으면), 없으면 fallback.
 *  - 로드 에러(onError) 시에도 fallback.
 * webm(vp9) 우선 + mp4 폴백 소스. 항상 muted·loop·playsInline (autoplay 정책 준수).
 *
 * 배치 가이드: 모바일 480px 셸 기준 720px 폭·5초 내외·2MB 이하(scripts/media-assets 참고).
 */

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

// prefers-reduced-motion 은 외부 스토어다 — 구독/스냅샷으로 읽는다(서버 스냅샷은 false).
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const canMatchMedia = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function'
const subscribeReducedMotion = (onStoreChange: () => void) => {
  if (!canMatchMedia()) return () => {}
  const mq = window.matchMedia(REDUCED_MOTION_QUERY)
  mq.addEventListener?.('change', onStoreChange)
  return () => mq.removeEventListener?.('change', onStoreChange)
}
const getReducedMotion = () => (canMatchMedia() ? window.matchMedia(REDUCED_MOTION_QUERY).matches : false)
const getReducedMotionServer = () => false

interface AmbientVideoProps {
  /** public/videos/{id}.webm (+ {id}.mp4 폴백) */
  id: string
  className?: string
  style?: React.CSSProperties
  /** reduced-motion·로딩 전 정적 이미지(public 경로). 없으면 fallback 사용 */
  poster?: string
  /** 영상 미존재/에러/reduced-motion 시 대체 렌더. 기본 null(기존 연출 유지) */
  fallback?: React.ReactNode
  /** 재생 속도(1=원속). 배경 앰비언트를 더 차분하게 늦출 때 0.5 등. */
  rate?: number
}

export function AmbientVideo({ id, className, style, poster, fallback = null, rate }: AmbientVideoProps) {
  const [status, setStatus] = useState<'checking' | 'ok' | 'missing'>('checking')
  const reduced = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, getReducedMotionServer)
  const videoRef = useRef<HTMLVideoElement>(null)

  // 재생 속도 반영 — 요소 마운트(status ok) 후 playbackRate 설정(느린 앰비언트)
  useEffect(() => {
    const v = videoRef.current
    if (v && rate != null) v.playbackRate = rate
  }, [rate, status])

  useEffect(() => {
    let alive = true
    // webm → mp4 순 HEAD — mp4 만 배포된 환경(ffmpeg 부재 파이프라인)에서도 재생돼야 한다
    fetch(`/videos/${id}.webm`, { method: 'HEAD' })
      .then((r) => {
        if (!alive) return null
        if (r.ok) {
          setStatus('ok')
          return null
        }
        return fetch(`/videos/${id}.mp4`, { method: 'HEAD' })
      })
      .then((r2) => {
        if (alive && r2) setStatus(r2.ok ? 'ok' : 'missing')
      })
      .catch(() => {
        if (alive) setStatus('missing')
      })
    return () => {
      alive = false
    }
  }, [id])

  // reduced-motion: 포스터 우선, 없으면 fallback
  if (reduced) {
    if (poster) return <img src={poster} alt="" aria-hidden className={className} style={style} />
    return <>{fallback}</>
  }

  // 🔴 «확인 중»과 «없음»을 가른다.
  //
  // 종전에는 둘 다 fallback 을 그렸다. fallback 이 null 이던 시절에는 무증상이었지만,
  // 사주 결과 로딩 화면의 fallback 자리에 정지 이미지(AmbientBackdrop)를 꽂은 뒤로는
  // 영상이 정상인 환경에서도 매번 «이미지가 먼저 깔렸다가 영상으로 갈아끼워지는» 깜빡임이
  // 생긴다. HEAD 응답을 기다리는 동안은 아무것도 그리지 않는 편이 맞다.
  if (status === 'checking') return null
  if (status !== 'ok') return <>{fallback}</>

  return (
    <video
      ref={videoRef}
      className={className}
      style={style}
      autoPlay
      muted
      loop
      playsInline
      poster={poster}
      aria-hidden
      onLoadedMetadata={(e) => {
        if (rate != null) e.currentTarget.playbackRate = rate
      }}
      onError={() => setStatus('missing')}
    >
      <source src={`/videos/${id}.webm`} type="video/webm" />
      <source src={`/videos/${id}.mp4`} type="video/mp4" />
    </video>
  )
}
