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
 * 멤버십 업그레이드 안내(MembershipNudgeModal) 상태.
 *
 *   const { nudgeModal, closeNudge, trackAnalysis, showPremiumNudge } = useUpgradeNudge({ currentTier })
 *   if (!hasPremiumAccess) { showPremiumNudge('가족 궁합 분석'); return }
 *   <MembershipNudgeModal {...nudgeModal} onClose={closeNudge} />
 *
 * 🔴 이용권이 모자란 안내는 여기서 열지 않는다 — `useInsufficientPass` 가 NO_PASS 로 연다.
 *    일일 사용 상한(DAILY_LIMIT)은 이용권 전환(2026-09-18)으로 폐지됐다.
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
    showPremiumNudge,
    trackAnalysis,
    resetSessionCount,
  }
}
