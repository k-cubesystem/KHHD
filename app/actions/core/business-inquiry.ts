'use server'

import { createClient } from '@/lib/supabase/server'
import { isEdgeEnabled } from '@/lib/supabase/edge-config'
import { invokeEdgeSafe } from '@/lib/supabase/invoke-edge'
import { logger } from '@/lib/utils/logger'
import { rateLimit } from '@/lib/utils/rate-limit'
import { headers } from 'next/headers'

export interface BusinessInquiryFormData {
  company_name: string
  contact_name: string
  email: string
  phone?: string
  employee_count: string
  message?: string
}

export interface BusinessInquiryResult {
  success: boolean
  error?: string
}

/**
 * B2B 문의 제출
 * - Rate limiting: IP 기반 5분당 3회
 * - 동일 이메일 중복 제출 방지: 24시간 내 동일 이메일+회사명 차단
 */
export async function submitBusinessInquiry(formData: BusinessInquiryFormData): Promise<BusinessInquiryResult> {
  if (isEdgeEnabled('business')) {
    return invokeEdgeSafe('business', { ...formData })
  }

  // --- Rate limiting: IP 기반 5분당 3회 ---
  const headersList = await headers()
  const forwarded = headersList.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown'
  const rateLimitResult = await rateLimit(`business-inquiry:${ip}`, {
    interval: 5 * 60 * 1000, // 5분
    uniqueTokenPerInterval: 3,
  })

  if (!rateLimitResult.success) {
    logger.warn('[business-inquiry] Rate limit exceeded:', { ip })
    return { success: false, error: '너무 많은 요청입니다. 5분 후에 다시 시도해주세요.' }
  }

  // Basic validation
  if (!formData.company_name?.trim()) {
    return { success: false, error: '회사명을 입력해주세요.' }
  }
  if (!formData.contact_name?.trim()) {
    return { success: false, error: '담당자 이름을 입력해주세요.' }
  }
  if (!formData.email?.trim()) {
    return { success: false, error: '이메일 주소를 입력해주세요.' }
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(formData.email)) {
    return { success: false, error: '유효한 이메일 주소를 입력해주세요.' }
  }
  if (!formData.employee_count?.trim()) {
    return { success: false, error: '직원 수를 선택해주세요.' }
  }

  try {
    const supabase = await createClient()

    // --- 중복 제출 방지: 24시간 내 동일 이메일+회사명 체크 ---
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: duplicate } = await supabase
      .from('business_inquiries')
      .select('id')
      .eq('email', formData.email.trim().toLowerCase())
      .eq('company_name', formData.company_name.trim())
      .gte('created_at', oneDayAgo)
      .limit(1)
      .maybeSingle()

    if (duplicate) {
      return { success: false, error: '동일한 문의가 이미 접수되어 있습니다. 24시간 후에 다시 시도해주세요.' }
    }

    const { error } = await supabase.from('business_inquiries').insert({
      company_name: formData.company_name.trim(),
      contact_name: formData.contact_name.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone?.trim() || null,
      employee_count: formData.employee_count,
      message: formData.message?.trim() || null,
      status: 'pending',
    })

    if (error) {
      logger.error('[business-inquiry] DB insert error:', error)
      return { success: false, error: '문의 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' }
    }

    return { success: true }
  } catch (err) {
    logger.error('[business-inquiry] Unexpected error:', err)
    return { success: false, error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' }
  }
}
