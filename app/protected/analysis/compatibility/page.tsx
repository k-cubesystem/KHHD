import { getDestinyTargets } from '@/app/actions/user/destiny'
import { CompatibilityClient } from './compatibility-client'

export default async function CompatibilityPage() {
  const targets = await getDestinyTargets()

  return <CompatibilityClient targets={targets} />
}
