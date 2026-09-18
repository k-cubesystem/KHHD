'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getFreeQuotaStatus, type FreeQuotaStatus } from '@/app/actions/user/free-quota'
import { toast } from 'sonner'

const DEFAULT_QUOTA: FreeQuotaStatus = {
  totalUsed: 0,
  remaining: 3,
  limit: 3,
  isExhausted: false,
  isLastFree: false,
  isPaid: false,
}

/**
 * useAnalysisQuota
 *
 * 분석 시작 전 무료 쿼터를 체크하고,
 * 소진 시 페이월 모달을 띄워 분석 실행을 차단합니다.
 *
 * 사용법:
 *   const { checkQuota, paywallProps, quota } = useAnalysisQuota()
 *
 *   // 분석 시작 버튼 핸들러에서:
 *   const canProceed = await checkQuota()
 *   if (!canProceed) return   // 페이월 모달이 자동으로 열립니다
 *   // ... 분석 실행
 *
 * 🔴 이용권을 쓰는 풀이 화면(사주·궁합·관상·손금·풍수·종합)에는 붙이지 않는다(2026-09-18).
 *    그쪽 판정은 서버가 한다(NO_PASS → useInsufficientPass). 여기서 먼저 막으면 무료인 캐시 적중까지
 *    막히고, 이용권을 쓰는 풀이를 «무료 분석»이라 부르게 된다.
 */
export function useAnalysisQuota() {
  const router = useRouter()
  const [quota, setQuota] = useState<FreeQuotaStatus>(DEFAULT_QUOTA)
  const [loading, setLoading] = useState(true)
  const [paywallOpen, setPaywallOpen] = useState(false)

  // 쿼터 로드
  useEffect(() => {
    getFreeQuotaStatus()
      .then(setQuota)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  /**
   * 분석 시작 전 호출.
   * - 허용되면 true 반환 (+ 마지막 1회 시 넛지 토스트)
   * - 소진 시 페이월 모달 열고 false 반환
   */
  const checkQuota = useCallback(async (): Promise<boolean> => {
    // 최신 쿼터 재조회
    let current = quota
    try {
      current = await getFreeQuotaStatus()
      setQuota(current)
    } catch {
      // 네트워크 오류 시 기존 상태 사용
    }

    if (current.isExhausted && !current.isPaid) {
      setPaywallOpen(true)
      return false
    }

    if (current.isLastFree) {
      toast.warning('무료 분석 1회 남았습니다', {
        description: '이번 분석 뒤에는 이용권이나 멤버십이 필요합니다.',
        duration: 5000,
        action: {
          label: '멤버십 보기',
          onClick: () => {
            router.push('/protected/membership')
          },
        },
      })
    }

    return true
  }, [quota, router])

  const closePaywall = useCallback(() => setPaywallOpen(false), [])

  return {
    quota,
    loading,
    checkQuota,
    paywallProps: {
      open: paywallOpen,
      onClose: closePaywall,
      isExhausted: quota.isExhausted,
      usedCount: quota.totalUsed,
      limit: quota.limit,
    },
  }
}
