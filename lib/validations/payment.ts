import { z } from 'zod'

export const paymentRequestSchema = z.object({
  productId: z.string().min(1, '상품 ID를 입력해주세요'),
  amount: z
    .number()
    .int()
    .positive('금액은 양수여야 합니다')
    .max(100_000, '1회 결제 금액은 100,000원을 넘을 수 없습니다'),
  orderId: z.string().min(1, '주문 ID를 입력해주세요'),
  orderName: z.string().min(1, '주문명을 입력해주세요'),
})

export type PaymentRequest = z.infer<typeof paymentRequestSchema>

export const subscriptionRequestSchema = z.object({
  planId: z.string().min(1, '플랜 ID를 입력해주세요'),
  paymentMethod: z.enum(['card', 'transfer', 'phone'], { required_error: '결제 수단을 선택해주세요' }),
})

export type SubscriptionRequest = z.infer<typeof subscriptionRequestSchema>
