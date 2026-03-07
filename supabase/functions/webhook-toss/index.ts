import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createSupabaseAdmin } from '../_shared/supabase-client.ts'
import { corsResponse, errorResponse, successResponse } from '../_shared/response.ts'

function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder()
  const bufA = encoder.encode(a)
  const bufB = encoder.encode(b)
  if (bufA.byteLength !== bufB.byteLength) return false
  let result = 0
  for (let i = 0; i < bufA.byteLength; i++) {
    result |= bufA[i] ^ bufB[i]
  }
  return result === 0
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse()

  const webhookSecret = Deno.env.get('TOSS_WEBHOOK_SECRET')
  if (!webhookSecret) return errorResponse('Webhook secret not configured', 500)

  // Verify signature
  const signature = req.headers.get('x-toss-signature') ?? ''
  const bodyText = await req.text()

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(webhookSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(bodyText))
  const expectedSig = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')

  if (!timingSafeEqual(signature, expectedSig)) {
    return errorResponse('Invalid signature', 401)
  }

  const event = JSON.parse(bodyText)
  const admin = createSupabaseAdmin()

  try {
    if (event.eventType === 'PAYMENT_STATUS_CHANGED') {
      const { paymentKey, status, orderId } = event.data
      await admin.from('payments').update({ status }).eq('payment_key', paymentKey)

      if (status === 'DONE') {
        // Process successful payment
        const { data: payment } = await admin
          .from('payments')
          .select('user_id, amount, metadata')
          .eq('payment_key', paymentKey)
          .maybeSingle()
        if (payment) {
          // Add talismans or activate subscription based on metadata
          console.log(`[webhook] Payment ${paymentKey} completed for user ${payment.user_id}`)
        }
      }
    }

    if (event.eventType === 'BILLING_STATUS_CHANGED') {
      const { billingKey, status } = event.data
      await admin.from('subscriptions').update({ status }).eq('billing_key', billingKey)
    }

    return successResponse()
  } catch (err) {
    console.error('[webhook-toss] Error:', err)
    return errorResponse('Internal error', 500)
  }
})
