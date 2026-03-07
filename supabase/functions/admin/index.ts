import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { requireAdmin } from '../_shared/auth.ts'
import { corsResponse, errorResponse, successResponse } from '../_shared/response.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse()

  const { action, ...body } = await req.json()
  const auth = await requireAdmin(req)
  if (auth instanceof Response) return auth
  const { adminSupabase } = auth

  // ─── dashboard ──────────────────────────────────────────────
  if (action === 'getMonitoringStats') {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

    const [users, analyses, payments] = await Promise.all([
      adminSupabase.from('profiles').select('*', { count: 'exact', head: true }),
      adminSupabase.from('analysis_history').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
      adminSupabase.from('wallet_transactions').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
    ])

    return successResponse({
      data: {
        totalUsers: users.count ?? 0,
        todayAnalyses: analyses.count ?? 0,
        todayPayments: payments.count ?? 0,
      },
    })
  }

  if (action === 'getRecentActivities') {
    const { data, error } = await adminSupabase
      .from('analysis_history')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(body.limit ?? 20)
    if (error) return errorResponse(error.message)
    return successResponse({ data })
  }

  if (action === 'getGeminiDailyStats') {
    const { data, error } = await adminSupabase
      .from('gemini_usage_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) return errorResponse(error.message)
    return successResponse({ data })
  }

  return errorResponse('Unknown action: ' + action)
})
