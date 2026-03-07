import { BusinessCompatibilityClient } from './business-compatibility-client'

export const metadata = {
  title: '사업 궁합 | 해화당',
  description: '사업 파트너와의 사주 궁합을 분석하여 협업 적합도를 확인하세요',
}

export default function BusinessCompatibilityPage() {
  return <BusinessCompatibilityClient />
}
