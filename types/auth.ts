export type UserRole = 'user' | 'admin' | 'tester'

export interface UserProfile {
  id: string
  email?: string
  role: UserRole
  created_at: string
}

export interface PricePlan {
  id: string
  name: string
  /** 이용권 팩이면 장 수 */
  credits: number
  price: number
  description: string | null
  badge_text: string | null
  features: string[] | null
  is_active: boolean
  sort_order?: number
  /** 'bokchae' = 판매 종료된 옛 팩 · 'pass' = 이용권 팩 */
  product_kind: 'bokchae' | 'pass'
  /** 이용권 유효기간(일, 결제일로부터). null 이면 PASS_VALID_DAYS */
  valid_days: number | null
}
