/**
 * 스토어 관리 화면의 행 모양. `'use server'` 파일(actions.ts)에는 async 함수만 둔다.
 */

export interface MembershipPlanAdmin {
  id: string
  name: string
  description: string | null
  tier: string
  price: number
  interval: string
  /** 매달 쓰는 이용권 장수 — 이월 없음 */
  monthly_passes: number
  relationship_limit: number
  storage_limit: number
  features: Record<string, unknown>
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

/** 개별 이용권 팩 — price_plans 중 product_kind='pass' 행만. `credits` = 장 수. */
export interface PassProductAdmin {
  id: string
  name: string
  description: string | null
  badge_text: string | null
  price: number
  credits: number
  valid_days: number | null
  features: string[] | null
  is_active: boolean
  sort_order: number | null
}

export type MembershipPlanUpdate = Partial<
  Pick<
    MembershipPlanAdmin,
    | 'name'
    | 'description'
    | 'price'
    | 'interval'
    | 'monthly_passes'
    | 'relationship_limit'
    | 'storage_limit'
    | 'features'
    | 'is_active'
    | 'sort_order'
  >
>

export type PassProductUpdate = Partial<
  Pick<
    PassProductAdmin,
    'name' | 'description' | 'badge_text' | 'price' | 'credits' | 'valid_days' | 'features' | 'is_active' | 'sort_order'
  >
>
