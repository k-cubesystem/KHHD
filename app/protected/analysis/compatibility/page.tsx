import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users } from 'lucide-react'

export default function CompatibilityPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden py-12 px-4">
      {/* Hanji Texture Overlay */}
      <div className="absolute inset-0 z-[1] pointer-events-none opacity-[0.03] mix-blend-multiply bg-[url('/texture/hanji_noise.png')] bg-repeat" />

      <div className="relative z-10 max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-surface/50 border border-primary/20 backdrop-blur-sm mb-4 rounded-full">
            <Users className="w-4 h-4 text-primary" strokeWidth={1} />
            <span className="text-[10px] font-light text-primary tracking-[0.2em] font-sans uppercase">
              Compatibility
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-light text-ink-light">궁합 분석</h1>
          <p className="text-sm text-ink-light/60 font-light">
            두 사람의 오행과 기운을 분석하여 관계의 해법을 제안합니다.
          </p>
        </div>

        <Card className="bg-surface/20 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg font-serif font-light text-center">
              준비 중입니다
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center pb-8">
            <p className="text-sm text-ink-light/50 font-light">
              궁합 분석 서비스가 곧 오픈될 예정입니다.
              <br />
              조금만 기다려주세요.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
