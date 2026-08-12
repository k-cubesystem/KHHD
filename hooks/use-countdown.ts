'use client'

import { useEffect, useState } from 'react'

export interface CountdownParts {
  days: number
  hours: number
  minutes: number
  seconds: number
}

/** 남은 시간 조각. 이미 지났으면 null. 순수 함수 — 테스트에서 직접 검증한다. */
export function getCountdownParts(targetTime: number, now: number = Date.now()): CountdownParts | null {
  const diff = targetTime - now
  if (diff <= 0) return null
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  }
}

/**
 * 목표 시각까지 남은 시간을 주기적으로 갱신한다.
 *
 * 인자가 Date 가 아니라 epoch ms(number)인 이유 — Date 를 받으면 렌더마다 새 참조가 들어와
 * 이펙트가 매 렌더 재구독되고 인터벌이 초기화된다(카운트다운이 영영 안 도는 경로가 생긴다).
 * number 는 값 비교라 참조가 흔들리지 않는다.
 *
 * @param targetTime 목표 시각(epoch ms). null 이면 멈추고 null 을 돌려준다.
 * @param intervalMs 갱신 주기. 초 단위를 표시하지 않는 화면은 60000 을 넘겨 리렌더를 아낀다.
 */
export function useCountdown(targetTime: number | null, intervalMs = 1000): CountdownParts | null {
  const [parts, setParts] = useState<CountdownParts | null>(() =>
    targetTime === null ? null : getCountdownParts(targetTime)
  )

  useEffect(() => {
    const update = () => setParts(targetTime === null ? null : getCountdownParts(targetTime))
    update()
    if (targetTime === null) return
    const id = setInterval(update, intervalMs)
    return () => clearInterval(id)
  }, [targetTime, intervalMs])

  return parts
}
