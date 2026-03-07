import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { requireAuth } from '../_shared/auth.ts'
import { createSupabaseAdmin } from '../_shared/supabase-client.ts'
import { corsResponse, errorResponse, successResponse } from '../_shared/response.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse()

  const { action, ...body } = await req.json()
  const auth = await requireAuth(req)
  if (auth instanceof Response) return auth
  const { supabase, userId } = auth

  // ─── destiny ────────────────────────────────────────────────
  if (action === 'getDestinyTargets') {
    const { data, error } = await supabase
      .from('family_members')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    if (error) return errorResponse(error.message)
    return successResponse({ data })
  }

  if (action === 'getDestinyTarget') {
    const { data, error } = await supabase
      .from('family_members')
      .select('*')
      .eq('id', body.targetId)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) return errorResponse(error.message)
    return successResponse({ data })
  }

  // ─── family ─────────────────────────────────────────────────
  if (action === 'getFamilyMembers') {
    const { data, error } = await supabase
      .from('family_members')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    if (error) return errorResponse(error.message)
    return successResponse({ data })
  }

  if (action === 'addFamilyMember') {
    const { data, error } = await supabase
      .from('family_members')
      .insert({ ...body.member, user_id: userId })
      .select()
      .single()
    if (error) return errorResponse(error.message)
    return successResponse({ data })
  }

  if (action === 'updateFamilyMember') {
    const { error } = await supabase
      .from('family_members')
      .update(body.member)
      .eq('id', body.memberId)
      .eq('user_id', userId)
    if (error) return errorResponse(error.message)
    return successResponse()
  }

  if (action === 'deleteFamilyMember') {
    const { error } = await supabase
      .from('family_members')
      .delete()
      .eq('id', body.memberId)
      .eq('user_id', userId)
    if (error) return errorResponse(error.message)
    return successResponse()
  }

  // ─── referral ───────────────────────────────────────────────
  if (action === 'getOrCreateReferralCode') {
    const { data: existing } = await supabase
      .from('referral_codes')
      .select('code')
      .eq('user_id', userId)
      .maybeSingle()
    if (existing) return successResponse({ code: existing.code })

    const code = crypto.randomUUID().slice(0, 8).toUpperCase()
    const { error } = await supabase
      .from('referral_codes')
      .insert({ user_id: userId, code })
    if (error) return errorResponse(error.message)
    return successResponse({ code })
  }

  if (action === 'getReferralStats') {
    const { data, error } = await supabase
      .from('referral_uses')
      .select('*')
      .eq('referrer_id', userId)
    if (error) return errorResponse(error.message)
    return successResponse({ data, count: data?.length ?? 0 })
  }

  // ─── history ────────────────────────────────────────────────
  if (action === 'getRecentAnalysis') {
    const { data, error } = await supabase
      .from('analysis_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(body.limit ?? 10)
    if (error) return errorResponse(error.message)
    return successResponse({ data })
  }

  if (action === 'getAnalysisById') {
    const { data, error } = await supabase
      .from('analysis_history')
      .select('*')
      .eq('id', body.analysisId)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) return errorResponse(error.message)
    return successResponse({ data })
  }

  if (action === 'saveAnalysisHistory') {
    const { data, error } = await supabase
      .from('analysis_history')
      .insert({ ...body.history, user_id: userId })
      .select()
      .single()
    if (error) return errorResponse(error.message)
    return successResponse({ data })
  }

  if (action === 'toggleFavorite') {
    const { data: existing } = await supabase
      .from('analysis_history')
      .select('is_favorite')
      .eq('id', body.analysisId)
      .eq('user_id', userId)
      .maybeSingle()
    const { error } = await supabase
      .from('analysis_history')
      .update({ is_favorite: !existing?.is_favorite })
      .eq('id', body.analysisId)
      .eq('user_id', userId)
    if (error) return errorResponse(error.message)
    return successResponse({ is_favorite: !existing?.is_favorite })
  }

  if (action === 'deleteAnalysisHistory') {
    const { error } = await supabase
      .from('analysis_history')
      .delete()
      .eq('id', body.analysisId)
      .eq('user_id', userId)
    if (error) return errorResponse(error.message)
    return successResponse()
  }

  // ─── free-quota ─────────────────────────────────────────────
  if (action === 'getFreeQuotaStatus') {
    const admin = createSupabaseAdmin()
    const { count } = await admin
      .from('analysis_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
    return successResponse({ used: count ?? 0, limit: 3 })
  }

  // ─── profile ────────────────────────────────────────────────
  if (action === 'saveProfile') {
    const { error } = await supabase
      .from('profiles')
      .update(body.profile)
      .eq('id', userId)
    if (error) return errorResponse(error.message)
    return successResponse()
  }

  // ─── share ──────────────────────────────────────────────────
  if (action === 'createShareLink') {
    const token = crypto.randomUUID()
    const { error } = await supabase
      .from('analysis_history')
      .update({ share_token: token })
      .eq('id', body.analysisId)
      .eq('user_id', userId)
    if (error) return errorResponse(error.message)
    return successResponse({ token })
  }

  return errorResponse('Unknown action: ' + action)
})
