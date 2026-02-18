import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getFamilyMembers, addFamilyMember, deleteFamilyMember } from '@/app/actions/user/family'

export const FAMILY_MEMBERS_KEY = ['family', 'members']

/**
 * Family Members 조회 훅
 * - 자동 캐싱 (10분) - 가족 구성원 정보는 자주 변경되지 않음
 * - 백그라운드 리페치
 */
export function useFamilyMembers() {
  return useQuery({
    queryKey: FAMILY_MEMBERS_KEY,
    queryFn: getFamilyMembers,
    staleTime: 10 * 60 * 1000, // 10 minutes - family data rarely changes
    gcTime: 30 * 60 * 1000, // 30 minutes cache time
  })
}

/**
 * Family Member 추가 훅
 * - 낙관적 업데이트
 * - 자동 캐시 무효화
 */
export function useAddFamilyMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (formData: FormData) => {
      return await addFamilyMember(formData)
    },
    onSuccess: () => {
      // 캐시 무효화하여 최신 데이터 다시 가져오기
      queryClient.invalidateQueries({ queryKey: FAMILY_MEMBERS_KEY })
    },
  })
}

/**
 * Family Member 삭제 훅
 * - 낙관적 업데이트
 * - 자동 캐시 무효화
 */
export function useDeleteFamilyMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      return await deleteFamilyMember(id)
    },
    onMutate: async (deletedId) => {
      // 진행 중인 refetch 취소
      await queryClient.cancelQueries({ queryKey: FAMILY_MEMBERS_KEY })

      // 이전 값 백업
      const previousMembers = queryClient.getQueryData(FAMILY_MEMBERS_KEY)

      // 낙관적 업데이트
      queryClient.setQueryData(FAMILY_MEMBERS_KEY, (old: any[]) => {
        return old?.filter((member) => member.id !== deletedId) || []
      })

      return { previousMembers }
    },
    onError: (_err, _deletedId, context) => {
      // 에러 발생 시 이전 값으로 롤백
      if (context?.previousMembers) {
        queryClient.setQueryData(FAMILY_MEMBERS_KEY, context.previousMembers)
      }
    },
    onSettled: () => {
      // 항상 최신 데이터 다시 가져오기
      queryClient.invalidateQueries({ queryKey: FAMILY_MEMBERS_KEY })
    },
  })
}
