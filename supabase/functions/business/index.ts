import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createSupabaseAdmin } from '../_shared/supabase-client.ts'
import { corsResponse, errorResponse, successResponse } from '../_shared/response.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse()

  const body = await req.json()

  if (!body.company_name?.trim()) return errorResponse('회사명을 입력해주세요.')
  if (!body.contact_name?.trim()) return errorResponse('담당자 이름을 입력해주세요.')
  if (!body.email?.trim()) return errorResponse('이메일 주소를 입력해주세요.')
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(body.email)) return errorResponse('유효한 이메일 주소를 입력해주세요.')
  if (!body.employee_count?.trim()) return errorResponse('직원 수를 선택해주세요.')

  try {
    const admin = createSupabaseAdmin()
    const { error } = await admin.from('business_inquiries').insert({
      company_name: body.company_name.trim(),
      contact_name: body.contact_name.trim(),
      email: body.email.trim().toLowerCase(),
      phone: body.phone?.trim() || null,
      employee_count: body.employee_count,
      message: body.message?.trim() || null,
      status: 'pending',
    })
    if (error) return errorResponse('문의 접수 중 오류가 발생했습니다.')
    return successResponse()
  } catch {
    return errorResponse('서버 오류가 발생했습니다.')
  }
})
