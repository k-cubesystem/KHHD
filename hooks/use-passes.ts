'use client'

import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getMyPassSummary } from '@/app/actions/payment/passes'

export const PASS_SUMMARY_KEY = ['passes', 'summary'] as const

/**
 * 내 이용권 요약 — 멤버십 이번 달 몫과 보유 이용권.
 * 사용은 서버 액션 안에서만 일어나므로(클라이언트가 이용권을 쓰는 경로는 없다),
 * 풀이가 끝난 뒤 `useRefreshPasses()` 로 다시 읽는다.
 */
export function usePassSummary() {
  return useQuery({
    queryKey: PASS_SUMMARY_KEY,
    queryFn: getMyPassSummary,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}

/** 풀이·구매 뒤 요약을 다시 읽게 한다. */
export function useRefreshPasses() {
  const queryClient = useQueryClient()
  return useCallback(() => queryClient.invalidateQueries({ queryKey: PASS_SUMMARY_KEY }), [queryClient])
}
