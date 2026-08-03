'use client'

import { useCallback, useEffect, useState } from 'react'
import { SHRINE_ANIM_CLASSES, auditProbes, type AnimAuditResult, type ClassProbe } from '@/lib/domain/shrine/anim-audit'

/**
 * 화면에 붙은 연출 클래스를 실제로 재 본다.
 *
 * ⚠️ 바로 재면 전부 죽은 것으로 나온다. 애니메이션은 요소가 붙고 스타일이 계산된 **뒤**에 시작하고,
 *    지연(animation-delay)을 두는 것도 많다. 그래서 한 번 재고 마는 대신 잠깐 뒤에 다시 잰다.
 * ⚠️ `getAnimations()` 는 재생 중이 아닌 것(대기·완료)도 돌려준다 — playState 로 걸러야
 *    "돌고 있다"가 된다.
 */
function probe(className: string): ClassProbe {
  const nodes = document.querySelectorAll(`.${className}`)
  let animated = 0
  for (const el of nodes) {
    const list = typeof el.getAnimations === 'function' ? el.getAnimations() : []
    if (list.some((a) => a.playState === 'running')) animated += 1
  }
  return { className, nodes: nodes.length, animated }
}

const EMPTY: AnimAuditResult = { dead: [], alive: [], partial: [], absent: [] }

export function useAnimAudit(enabled: boolean): { result: AnimAuditResult; measure: () => void } {
  const [result, setResult] = useState<AnimAuditResult>(EMPTY)

  const measure = useCallback(() => {
    if (typeof document === 'undefined') return
    setResult(auditProbes(SHRINE_ANIM_CLASSES.map(probe)))
  }, [])

  useEffect(() => {
    if (!enabled) return
    // 지연을 둔 연출까지 잡히도록 세 번 — 마지막 값이 화면에 남는다
    const timers = [400, 1500, 3000].map((ms) => setTimeout(measure, ms))
    return () => timers.forEach(clearTimeout)
  }, [enabled, measure])

  return { result, measure }
}
