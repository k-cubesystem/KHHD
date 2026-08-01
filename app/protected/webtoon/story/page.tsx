import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { StoryForm } from '@/components/webtoon/StoryForm'

export const metadata = { title: '내 이야기 쓰기' }

/** 사연 접수 페이지 — 폼 하나. 로그인 게이트는 /protected 레이아웃·미들웨어가 이미 건다. */
export default function WebtoonStoryPage() {
  return (
    <div className="min-h-screen px-4 py-6">
      <div className="mx-auto w-full max-w-[480px] space-y-4">
        <Link
          href="/protected/webtoon"
          className="inline-flex items-center gap-1 font-serif text-[12px] text-ink-primary/50"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          웹툰으로
        </Link>
        <StoryForm />
      </div>
    </div>
  )
}
