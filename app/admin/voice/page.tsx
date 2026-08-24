import { AdminPageHeader } from '@/components/admin/ui/page-header'
import { VoiceAdminClient, type DeityVoiceRow } from './voice-admin-client'
import { createClient } from '@/lib/supabase/server'
import { ALL_DEITY_CODES, DEITY_ARCHETYPE, voiceProfileFor } from '@/lib/domain/shrine/voice-profiles'
import { loadAllVoiceOverrides } from '@/lib/services/voice-profile-store'
import { parsePitchHz } from '@/lib/domain/shrine/voice-catalog'

export const dynamic = 'force-dynamic'

/** 신위 이름은 시드(shrine_deities)가 정본 — 화면에 이름을 다시 적지 않는다(갈리면 딴 신위가 된다). */
async function loadDeityNames(): Promise<Record<string, string>> {
  try {
    const supabase = await createClient()
    const { data } = await supabase.from('shrine_deities').select('code, name')
    const out: Record<string, string> = {}
    for (const d of data ?? []) out[d.code as string] = d.name as string
    return out
  } catch {
    return {}
  }
}

export default async function AdminVoicePage() {
  const [names, overrides] = await Promise.all([loadDeityNames(), loadAllVoiceOverrides()])

  const rows: DeityVoiceRow[] = ALL_DEITY_CODES.map((code) => {
    const profile = overrides[code] ?? voiceProfileFor(code)
    return {
      deityCode: code,
      name: names[code] ?? code,
      archetype: DEITY_ARCHETYPE[code] ?? 'default',
      edgeVoice: profile.edgeVoice,
      pitchHz: parsePitchHz(profile.edgePitch),
      rate: profile.rate,
      browserPitch: profile.pitch,
      voiceHint: profile.voiceHint,
      customized: Boolean(overrides[code]),
    }
  })

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="신위 음성"
        description="속풀이에서 신위가 말할 때의 목소리·속도·음높이를 조절합니다. 저장하면 즉시 반영됩니다(배포 불필요)."
      />
      <VoiceAdminClient rows={rows} />
    </div>
  )
}
