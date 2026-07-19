import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { parseElementForm, elementFormToModifier } from '@/lib/domain/shrine/element-form'

/**
 * 관상·손금 분석 원문에서 오행형을 뽑아 기운 프로필 보정으로 저장한다 (P2-13).
 * 저장된 보정은 신당 기운·용신 계산에 즉시 반영된다(scene.ts applyModifiers).
 *
 * - 대상: 본인(familyMemberId=null) 또는 가족.
 * - 태그가 없으면(모델이 확신 없어 생략) 아무것도 저장하지 않는다.
 * - 부가 기능이므로 실패해도 분석 자체는 성공 처리 — 다만 로깅한다.
 */
export async function saveElementFormModifier(input: {
  userId: string
  familyMemberId?: string | null
  analysisText: string
  kind: 'face' | 'palm'
}): Promise<void> {
  try {
    const form = parseElementForm(input.analysisText)
    if (!form) return

    const modifier = elementFormToModifier(form)
    const column = input.kind === 'face' ? 'face_modifier' : 'palm_modifier'
    const admin = createAdminClient()
    const familyMemberId = input.familyMemberId ?? null

    // 기존 행이 있으면 해당 컬럼만 갱신, 없으면 생성 (본인=NULL 스코프 주의)
    const lookup = admin.from('user_energy_profile').select('id').eq('user_id', input.userId)
    const { data: existing } = await (
      familyMemberId ? lookup.eq('family_member_id', familyMemberId) : lookup.is('family_member_id', null)
    ).maybeSingle()

    if (existing?.id) {
      const { error } = await admin
        .from('user_energy_profile')
        .update({ [column]: modifier })
        .eq('id', existing.id)
      if (error) logger.warn('[element-profile] update failed:', error)
    } else {
      const { error } = await admin.from('user_energy_profile').insert({
        user_id: input.userId,
        family_member_id: familyMemberId,
        [column]: modifier,
      })
      if (error) logger.warn('[element-profile] insert failed:', error)
    }

    logger.log('[element-profile] 오행형 반영:', { kind: input.kind, element: form.element })
  } catch (e) {
    logger.warn('[element-profile] exception:', e)
  }
}
