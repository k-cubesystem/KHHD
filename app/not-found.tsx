import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '페이지를 찾을 수 없습니다',
}

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-6">
      <div className="text-center space-y-6 max-w-md">
        <div className="text-6xl font-serif text-primary/60">404</div>
        <h1 className="text-xl font-bold">페이지를 찾을 수 없습니다</h1>
        <p className="text-sm text-muted-foreground">
          요청하신 페이지가 존재하지 않거나 이동되었습니다.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 rounded-lg bg-primary/20 text-primary text-sm font-medium hover:bg-primary/30 transition-colors"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  )
}
