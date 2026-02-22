import { AnimatedHeader } from '@/components/admin/dashboard-stats'
import { SajuEngineDashboard } from './saju-engine-dashboard'

export default function SajuEnginePage() {
  return (
    <>
      <AnimatedHeader title="해화지기 사주 엔진" subtitle="명리학 알고리즘 구조 및 실시간 테스트 대시보드" />
      <div className="mt-8">
        <SajuEngineDashboard />
      </div>
    </>
  )
}
