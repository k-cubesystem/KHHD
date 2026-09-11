import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getStoryGate } from '@/app/actions/webtoon/webtoon'
import { StoryForm } from '@/components/webtoon/StoryForm'

export const metadata = { title: '내 이야기 쓰기' }

/**
 * 사연 접수 페이지 — 폼 하나.
 * ⚠️ 웹툰이 공개 라우트로 나오면서(/webtoon, 2026-09-08) /protected 의 자동 게이트가 사라졌다 —
 *    개인정보 폼이므로 여기서 직접 로그인만 요구한다(제출 액션도 서버에서 다시 판정한다).
 */
export default async function WebtoonStoryPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // 값은 **들어오기 전에** 안다 — 눌러 들어가서야 액수를 아는 문을 만들지 않는다
  const gate = await getStoryGate()

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="mx-auto w-full max-w-[480px] space-y-4">
        <Link href="/webtoon" className="inline-flex items-center gap-1 font-serif text-[12px] text-ink-primary/50">
          <ChevronLeft className="h-3.5 w-3.5" />
          웹툰으로
        </Link>
        <StoryForm gate={gate} />
      </div>
    </div>
  )
}
