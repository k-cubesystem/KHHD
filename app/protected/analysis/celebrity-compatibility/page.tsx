import { CelebrityCompatibilityClient } from './celebrity-compatibility-client'

export const metadata = {
  title: '스타 궁합 | 해화당',
  description: '좋아하는 유명인과의 사주 궁합을 확인하세요',
}

export default function CelebrityCompatibilityPage() {
  return <CelebrityCompatibilityClient />
}
