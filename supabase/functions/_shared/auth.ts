import { createSupabaseClient, createSupabaseAdmin } from './supabase-client.ts'
import { errorResponse } from './response.ts'
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface AuthContext {
  supabase: SupabaseClient
  userId: string
}

interface AdminContext extends AuthContext {
  adminSupabase: SupabaseClient
}

export async function requireAuth(req: Request): Promise<AuthContext | Response> {
  const supabase = createSupabaseClient(req)
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return errorResponse('로그인이 필요합니다.', 401)
  }

  return { supabase, userId: user.id }
}

export async function requireAdmin(req: Request): Promise<AdminContext | Response> {
  const supabase = createSupabaseClient(req)
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return errorResponse('로그인이 필요합니다.', 401)
  }

  const adminSupabase = createSupabaseAdmin()
  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'admin') {
    return errorResponse('관리자 권한이 필요합니다.', 403)
  }

  return { supabase, adminSupabase, userId: user.id }
}
