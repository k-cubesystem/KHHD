import { createClient } from '@/lib/supabase/server'
import { getDestinyTargets } from '@/app/actions/user/destiny'
import { FortuneClient } from './fortune-client'

export default async function FortunePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const targets = await getDestinyTargets()
  const selfTarget = targets.find((t) => t.target_type === 'self') || targets[0] || null

  return <FortuneClient selfTarget={selfTarget} targets={targets} />
}
