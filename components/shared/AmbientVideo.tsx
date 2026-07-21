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

import { useEffect, useState } from 'react'

interface AmbientVideoProps {
  /** public/videos/{id}.webm (+ {id}.mp4 폴백) */
  id: string
  className?: string
  style?: React.CSSProperties
  /** reduced-motion·로딩 전 정적 이미지(public 경로). 없으면 fallback 사용 */
  poster?: string
  /** 영상 미존재/에러/reduced-motion 시 대체 렌더. 기본 null(기존 연출 유지) */
  fallback?: React.ReactNode
}

export function AmbientVideo({ id, className, style, poster, fallback = null }: AmbientVideoProps) {
  const [status, setStatus] = useState<'checking' | 'ok' | 'missing'>('checking')
  const [reduced, setReduced] = useState(false)

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
    fetch(`/videos/${id}.webm`, { method: 'HEAD' })
      .then((r) => {
        if (alive) setStatus(r.ok ? 'ok' : 'missing')
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
      className={className}
      style={style}
      autoPlay
      muted
      loop
      playsInline
      poster={poster}
      aria-hidden
      onError={() => setStatus('missing')}
    >
      <source src={`/videos/${id}.webm`} type="video/webm" />
      <source src={`/videos/${id}.mp4`} type="video/mp4" />
    </video>
  )
}
