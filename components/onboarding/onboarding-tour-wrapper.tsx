'use client'

import { useState, useEffect } from 'react'
import { logger } from '@/lib/utils/logger'
import { OnboardingTour } from './onboarding-tour'
import { createClient } from '@/lib/supabase/client'

export function OnboardingTourWrapper() {
  const [shouldShow, setShouldShow] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    checkOnboardingStatus()
  }, [])

  const checkOnboardingStatus = async () => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setIsChecking(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single()

      // 온보딩을 아직 완료하지 않은 경우에만 표시
      if (profile && !profile.onboarding_completed) {
        setShouldShow(true)
      }
    } catch (error) {
      logger.error('Onboarding check error:', error)
    } finally {
      setIsChecking(false)
    }
  }

  const handleComplete = async () => {
    setShouldShow(false)

    // 온보딩 완료 상태 저장
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user.id)
      }
    } catch (error) {
      logger.error('Onboarding complete error:', error)
    }
  }

  if (isChecking) return null

  return <OnboardingTour shouldShow={shouldShow} onComplete={handleComplete} />
}
