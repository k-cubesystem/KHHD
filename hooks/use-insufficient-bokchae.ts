'use client'

import { useState, useCallback } from 'react'

interface InsufficientBokchaeState {
  isOpen: boolean
  currentBalance: number
  requiredAmount: number
  featureLabel?: string
}

const INITIAL_STATE: InsufficientBokchaeState = {
  isOpen: false,
  currentBalance: 0,
  requiredAmount: 0,
  featureLabel: undefined,
}

/**
 * Hook to manage the InsufficientBokchaeModal state.
 *
 * Usage:
 *   const { bokchaeModal, showBokchaeModal, closeBokchaeModal } = useInsufficientBokchae()
 *
 *   // When deductTalisman returns INSUFFICIENT_BALANCE:
 *   showBokchaeModal({ currentBalance: balance, requiredAmount: cost, featureLabel: '관상 분석' })
 *
 *   // In JSX:
 *   <InsufficientBokchaeModal {...bokchaeModal} onClose={closeBokchaeModal} />
 */
export function useInsufficientBokchae() {
  const [state, setState] = useState<InsufficientBokchaeState>(INITIAL_STATE)

  const showBokchaeModal = useCallback(
    (params: { currentBalance: number; requiredAmount: number; featureLabel?: string }) => {
      setState({ isOpen: true, ...params })
    },
    []
  )

  const closeBokchaeModal = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }))
  }, [])

  /**
   * Checks a deductTalisman result and opens the modal if balance is insufficient.
   * Returns true when the error was handled (caller should abort), false otherwise.
   */
  const handleDeductResult = useCallback(
    (
      result: { success: boolean; error?: string; errorType?: string; remainingBalance?: number },
      opts: { currentBalance: number; requiredAmount: number; featureLabel?: string }
    ): boolean => {
      if (result.success) return false

      if (result.errorType === 'INSUFFICIENT_BALANCE') {
        showBokchaeModal(opts)
        return true
      }

      return false
    },
    [showBokchaeModal]
  )

  return {
    bokchaeModal: state,
    showBokchaeModal,
    closeBokchaeModal,
    handleDeductResult,
  }
}
