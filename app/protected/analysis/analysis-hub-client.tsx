'use client'

import { ReactNode } from 'react'
import { AnalysisDashboard } from '@/components/analysis/AnalysisDashboard'

interface RouletteStatus {
  canSpin: boolean
  nextAvailableTime?: string
}

interface MonthlyFortune {
  currentFortune: number
  totalPossible: number
  percentage: number
  completedCategories: string[]
}

interface AnalysisHubClientProps {
  userName?: string
  monthlyFortune: MonthlyFortune
  rouletteStatus: RouletteStatus | null
  children?: ReactNode
}

export function AnalysisHubClient({
  userName,
  monthlyFortune,
  rouletteStatus,
  children,
}: AnalysisHubClientProps) {
  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      {/* Hanji Texture Overlay */}
      <div className="absolute inset-0 z-[1] pointer-events-none opacity-[0.03] mix-blend-multiply bg-[url('/texture/hanji_noise.png')] bg-repeat" />

      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#D4AF37]/3 rounded-full blur-[200px]" />
      </div>

      <div className="relative z-10 w-full pt-6">
        <AnalysisDashboard
          userName={userName}
          monthlyFortune={monthlyFortune}
          rouletteStatus={rouletteStatus}
        >
          {children}
        </AnalysisDashboard>
      </div>
    </main>
  )
}
