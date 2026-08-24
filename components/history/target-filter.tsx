'use client'

import { useEffect, useState } from 'react'
import { logger } from '@/lib/utils/logger'
import { TargetSelect, toTargetOption, type TargetOption } from '@/components/destiny/target-select'
import { getDestinyTargets } from '@/app/actions/user/destiny'

/**
 * 기록 화면의 대상 필터 — 「전체 보기」가 하나 더 붙은 것 말고는 다른 화면의 대상 선택과 같다.
 * 모양은 `TargetSelect` 하나가 정한다(2026-08-25 드롭다운 통일).
 */

/** 목록 밖 항목. 대상 id 는 uuid 라 이 문자열과 부딪히지 않는다. */
const ALL_OPTION = { id: 'ALL', label: '전체 보기' }

interface TargetFilterProps {
  selectedTargetId: string | null
  onTargetChange: (targetId: string | null) => void
}

export function TargetFilter({ selectedTargetId, onTargetChange }: TargetFilterProps) {
  const [targets, setTargets] = useState<TargetOption[] | null>(null)

  useEffect(() => {
    let active = true
    getDestinyTargets()
      .then((data) => {
        if (active) setTargets(data.map(toTargetOption))
      })
      .catch((error) => {
        logger.error('Failed to load destiny targets:', error)
        if (active) setTargets([])
      })
    return () => {
      active = false
    }
  }, [])

  // 고를 대상이 없으면 필터 자체가 의미 없다 — 자리를 비운다(로딩 중에도 뼈대를 세우지 않는다).
  if (targets === null || targets.length === 0) return null

  return (
    <TargetSelect
      label="분석 대상 필터"
      targets={targets}
      value={selectedTargetId ?? ALL_OPTION.id}
      onChange={(id) => onTargetChange(id === ALL_OPTION.id ? null : id)}
      allOption={ALL_OPTION}
      placeholder={ALL_OPTION.label}
    />
  )
}
