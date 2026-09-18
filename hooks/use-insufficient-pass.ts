'use client'

import { useCallback, useState } from 'react'
import { NO_PASS_ERROR } from '@/lib/domain/entitlement/pass'

interface InsufficientPassState {
  isOpen: boolean
  requiredUnits: number
  featureLabel?: string
}

const INITIAL_STATE: InsufficientPassState = { isOpen: false, requiredUnits: 0, featureLabel: undefined }

/**
 * 「이용권이 부족해요」 안내 상태.
 *
 *   const { passModal, handleChargeResult, closePassModal } = useInsufficientPass()
 *   const res = await someReadingAction(...)
 *   if (handleChargeResult(res, { featureLabel: '관상 풀이' })) return
 *   <InsufficientPassModal {...passModal} onClose={closePassModal} />
 *
 * 서버 액션이 돌려준 `errorType === 'NO_PASS'` 일 때만 열린다. 장 수는 서버가 실어 보낸
 * `requiredUnits` 를 쓴다 — 화면이 숫자를 따로 들고 있지 않는다.
 */
export function useInsufficientPass() {
  const [state, setState] = useState<InsufficientPassState>(INITIAL_STATE)

  const showPassModal = useCallback((params: { requiredUnits: number; featureLabel?: string }) => {
    setState({ isOpen: true, ...params })
  }, [])

  const closePassModal = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }))
  }, [])

  /** 이용권 부족이면 안내를 열고 true(호출부는 멈춘다). 아니면 false. */
  const handleChargeResult = useCallback(
    (
      result: { success?: boolean; errorType?: string; requiredUnits?: number } | null | undefined,
      opts?: { featureLabel?: string; requiredUnits?: number }
    ): boolean => {
      if (!result || result.success) return false
      if (result.errorType !== NO_PASS_ERROR) return false
      showPassModal({
        requiredUnits: result.requiredUnits ?? opts?.requiredUnits ?? 1,
        featureLabel: opts?.featureLabel,
      })
      return true
    },
    [showPassModal]
  )

  return { passModal: state, showPassModal, closePassModal, handleChargeResult }
}
