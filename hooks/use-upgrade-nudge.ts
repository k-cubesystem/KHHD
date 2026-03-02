'use client'

import { useState, useCallback, useRef } from 'react'
import type { MembershipTier, NudgeTrigger } from '@/components/membership/membership-nudge-modal'

// ─── Session-analysis counter (resets on page reload) ────────────────────────
// We use a module-level ref so the count persists across hook re-renders
// but resets on navigation / full page refresh.
let _sessionAnalysisCount = 0
const GENTLE_REMINDER_THRESHOLD = 5

interface UpgradeNudgeState {
  isOpen: boolean
  trigger: NudgeTrigger
  currentTier: MembershipTier | null
  featureLabel?: string
}

const INITIAL_STATE: UpgradeNudgeState = {
  isOpen: false,
  trigger: 'GENTLE_REMINDER',
  currentTier: null,
  featureLabel: undefined,
}

/**
 * Hook to manage the MembershipNudgeModal state.
 *
 * Usage:
 * ─────
 *   const { nudgeModal, closeNudge, handleDeductResult, trackAnalysis, showPremiumNudge } =
 *     useUpgradeNudge({ currentTier: userTier })
 *
 *   // After each deductTalisman call:
 *   handleDeductResult(deductResult, { featureLabel: '관상 분석' })
 *
 *   // Before accessing a premium feature:
 *   if (!hasPremiumAccess) { showPremiumNudge('가족 궁합 분석'); return }
 *
 *   // In JSX:
 *   <MembershipNudgeModal {...nudgeModal} onClose={closeNudge} />
 */
export function useUpgradeNudge(opts?: { currentTier?: MembershipTier | null }) {
  const [state, setState] = useState<UpgradeNudgeState>(INITIAL_STATE)
  // Track whether we already showed the gentle reminder this session
  const gentleShownRef = useRef(false)

  const currentTier = opts?.currentTier ?? null

  // ── Open helpers ───────────────────────────────────────────────────────────

  const openNudge = useCallback(
    (trigger: NudgeTrigger, featureLabel?: string) => {
      setState({ isOpen: true, trigger, currentTier, featureLabel })
    },
    [currentTier]
  )

  const closeNudge = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }))
  }, [])

  // ── Trigger: daily limit hit ───────────────────────────────────────────────

  /**
   * Pass the result object from `deductTalisman()` to automatically open the
   * nudge modal on `DAILY_LIMIT` errors.
   *
   * Returns `true` when the error was handled (caller should abort its logic).
   */
  const handleDeductResult = useCallback(
    (
      result: {
        success: boolean
        error?: string
        errorType?: string
        currentTier?: string
      },
      opts?: { featureLabel?: string }
    ): boolean => {
      if (result.success) return false

      if (result.errorType === 'DAILY_LIMIT') {
        openNudge('DAILY_LIMIT', opts?.featureLabel)
        return true
      }

      // INSUFFICIENT_BALANCE handled by useInsufficientBokchae separately
      return false
    },
    [openNudge]
  )

  // ── Trigger: premium-only feature ─────────────────────────────────────────

  /**
   * Call this when the user touches a premium-gated feature.
   */
  const showPremiumNudge = useCallback(
    (featureLabel?: string) => {
      openNudge('PREMIUM_FEATURE', featureLabel)
    },
    [openNudge]
  )

  // ── Trigger: gentle reminder after N analyses ──────────────────────────────

  /**
   * Call this once after each successful AI analysis.
   * After GENTLE_REMINDER_THRESHOLD (5) analyses in the session the nudge
   * will appear once.
   */
  const trackAnalysis = useCallback(() => {
    _sessionAnalysisCount += 1
    if (!gentleShownRef.current && _sessionAnalysisCount >= GENTLE_REMINDER_THRESHOLD) {
      gentleShownRef.current = true
      openNudge('GENTLE_REMINDER')
    }
  }, [openNudge])

  // ── Convenience: reset session counter (e.g. on user logout) ──────────────

  const resetSessionCount = useCallback(() => {
    _sessionAnalysisCount = 0
    gentleShownRef.current = false
  }, [])

  return {
    /** Spread these props onto <MembershipNudgeModal /> */
    nudgeModal: state,
    closeNudge,
    handleDeductResult,
    showPremiumNudge,
    trackAnalysis,
    resetSessionCount,
  }
}
