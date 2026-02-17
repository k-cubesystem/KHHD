import { getRouletteConfig } from '@/app/actions/payment/roulette'
import RouletteConfigClient from './roulette-config-client'

export default async function RouletteAdminPage() {
  const { config } = await getRouletteConfig()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">행운의 룰렛 관리</h1>
        <p className="text-muted-foreground mt-2">
          룰렛 상품 및 확률을 설정합니다. 복채 기본 단위: 1만냥
        </p>
      </div>
      <RouletteConfigClient initialConfig={config} />
    </div>
  )
}
