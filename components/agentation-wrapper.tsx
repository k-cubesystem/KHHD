'use client'

import { Agentation } from 'agentation'
import { useHydrated } from '@/hooks/use-hydrated'

export function AgentationWrapper() {
  const mounted = useHydrated()

  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  if (!mounted) return null

  return <Agentation />
}
