import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getWalletBalance, deductTalisman } from '@/app/actions/payment/wallet'

export const WALLET_BALANCE_KEY = ['wallet', 'balance']

/**
 * Wallet Balance 조회 훅
 * - 자동 캐싱 (2분)
 * - 백그라운드 리페치 제거 (mutation으로 업데이트)
 */
export function useWalletBalance() {
  return useQuery({
    queryKey: WALLET_BALANCE_KEY,
    queryFn: getWalletBalance,
    staleTime: 2 * 60 * 1000, // 2 minutes - balance checked via mutations
    gcTime: 5 * 60 * 1000, // 5 minutes cache time
    // refetchInterval removed - balance is updated via mutations
  })
}

/**
 * Talisman 차감 훅
 * - 낙관적 업데이트
 * - 자동 캐시 갱신
 */
export function useDeductTalisman() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ featureKey, customAmount }: { featureKey: string; customAmount?: number }) => {
      return await deductTalisman(featureKey, customAmount)
    },
    onMutate: async ({ customAmount }) => {
      // 진행 중인 refetch 취소
      await queryClient.cancelQueries({ queryKey: WALLET_BALANCE_KEY })

      // 이전 값 백업
      const previousBalance = queryClient.getQueryData<number>(WALLET_BALANCE_KEY)

      // 낙관적 업데이트
      if (previousBalance !== undefined && customAmount) {
        queryClient.setQueryData(WALLET_BALANCE_KEY, previousBalance - customAmount)
      }

      return { previousBalance }
    },
    onError: (_err, _variables, context) => {
      // 에러 발생 시 이전 값으로 롤백
      if (context?.previousBalance !== undefined) {
        queryClient.setQueryData(WALLET_BALANCE_KEY, context.previousBalance)
      }
    },
    onSuccess: (data) => {
      // 서버에서 반환한 실제 잔액으로 업데이트
      if (data.success && data.remainingBalance !== undefined) {
        queryClient.setQueryData(WALLET_BALANCE_KEY, data.remainingBalance)
      }
    },
    onSettled: () => {
      // 최신 데이터 다시 가져오기
      queryClient.invalidateQueries({ queryKey: WALLET_BALANCE_KEY })
    },
  })
}

// 복채 충전 훅(useAddTalisman)은 제거됨 — 복채 발행은 클라이언트에서 호출할 수 없다.
// 충전은 결제 승인(confirmPayment) 결과로만 일어나며, 잔액 갱신은 WALLET_BALANCE_KEY
// invalidate 로 처리한다.
