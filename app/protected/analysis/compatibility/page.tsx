import { getDestinyTargets } from '@/app/actions/destiny-targets'
import { CompatibilityClient } from './compatibility-client'

export default async function CompatibilityPage() {
  const targets = await getDestinyTargets()

  return <CompatibilityClient targets={targets} />
}
