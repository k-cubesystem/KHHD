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

import { useEffect, useRef, useState } from 'react'

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
  const [reduced, setReduced] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // 재생 속도 반영 — 요소 마운트(status ok) 후 playbackRate 설정(느린 앰비언트)
  useEffect(() => {
    const v = videoRef.current
    if (v && rate != null) v.playbackRate = rate
  }, [rate, status])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const on = () => setReduced(mq.matches)
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  }, [])

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

  // 파일 확인 중·미존재 → fallback(기존 연출 유지)
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
