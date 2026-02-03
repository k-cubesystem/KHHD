import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getWalletBalance, deductTalisman, addTalismans } from "@/app/actions/wallet-actions";

export const WALLET_BALANCE_KEY = ["wallet", "balance"];

/**
 * Wallet Balance 조회 훅
 * - 자동 캐싱 (30초)
 * - 백그라운드 리페치
 */
export function useWalletBalance() {
    return useQuery({
        queryKey: WALLET_BALANCE_KEY,
        queryFn: getWalletBalance,
        staleTime: 30 * 1000, // 30 seconds
        refetchInterval: 60 * 1000, // 1 minute background refetch
    });
}

/**
 * Talisman 차감 훅
 * - 낙관적 업데이트
 * - 자동 캐시 갱신
 */
export function useDeductTalisman() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ featureKey, customAmount }: { featureKey: string; customAmount?: number }) => {
            return await deductTalisman(featureKey, customAmount);
        },
        onMutate: async ({ customAmount }) => {
            // 진행 중인 refetch 취소
            await queryClient.cancelQueries({ queryKey: WALLET_BALANCE_KEY });

            // 이전 값 백업
            const previousBalance = queryClient.getQueryData<number>(WALLET_BALANCE_KEY);

            // 낙관적 업데이트
            if (previousBalance !== undefined && customAmount) {
                queryClient.setQueryData(WALLET_BALANCE_KEY, previousBalance - customAmount);
            }

            return { previousBalance };
        },
        onError: (_err, _variables, context) => {
            // 에러 발생 시 이전 값으로 롤백
            if (context?.previousBalance !== undefined) {
                queryClient.setQueryData(WALLET_BALANCE_KEY, context.previousBalance);
            }
        },
        onSuccess: (data) => {
            // 서버에서 반환한 실제 잔액으로 업데이트
            if (data.success && data.remainingBalance !== undefined) {
                queryClient.setQueryData(WALLET_BALANCE_KEY, data.remainingBalance);
            }
        },
        onSettled: () => {
            // 최신 데이터 다시 가져오기
            queryClient.invalidateQueries({ queryKey: WALLET_BALANCE_KEY });
        },
    });
}

/**
 * Talisman 추가 훅
 * - 자동 캐시 갱신
 */
export function useAddTalisman() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (amount: number) => {
            return await addTalismans(amount);
        },
        onSuccess: () => {
            // 캐시 무효화하여 최신 잔액 가져오기
            queryClient.invalidateQueries({ queryKey: WALLET_BALANCE_KEY });
        },
    });
}
