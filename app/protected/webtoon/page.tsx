import Link from 'next/link'
import { BookOpen, ChevronRight } from 'lucide-react'

export const metadata = { title: '웹툰' }

/**
 * 웹툰 연재 — 하단 내비 「가족관리」 자리를 이어받은 칸 (CEO 2026-08-01).
 *
 * ⚠️ 아직 **연재 전**이다. 대본·작화가 별 저장소(D:\anti\webtoon)에서 진행 중이라 여기서는
 *    빈 화면 대신 **무엇이 오는지**를 말한다 — 눌러 들어왔는데 아무것도 없는 칸이 내비에
 *    자리를 차지하고 있으면 그 자체가 결함으로 읽힌다.
 *    회차가 들어오면 이 페이지가 목록으로 바뀐다(라우트·내비는 그대로 쓰면 된다).
 */
export default function WebtoonPage() {
  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto w-full max-w-[480px] space-y-5">
        <header className="text-center">
          <p className="font-serif text-[10px] tracking-[0.4em] text-gold-500/60">連 載</p>
          <h1 className="mt-1 font-serif text-2xl font-bold text-ink-primary">청담해화당</h1>
          <p className="mt-2 font-sans text-[13px] text-ink-primary/50">공식 웹툰</p>
        </header>

        <div className="hanji-card rounded-2xl border border-gold-500/25 p-6 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-[3px] border border-gold-500/40 bg-gold-500/[0.1]">
            <BookOpen className="h-5 w-5 text-gold-200" />
          </span>
          <p className="mt-4 font-serif text-[15px] font-bold text-ink-primary">첫 화를 그리는 중입니다</p>
          <p className="mt-2 font-sans text-[12.5px] leading-relaxed text-ink-primary/55">
            신당에 깃든 신위들과, 그들을 찾아오는 사람들의 이야기입니다.
            <br />
            연재가 시작되면 이 자리에서 바로 보실 수 있습니다.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-surface/50 p-5">
          <p className="font-serif text-[11px] tracking-[0.2em] text-gold-500/60">먼저 만나 보실 곳</p>
          <p className="mt-2 font-sans text-[12.5px] leading-relaxed text-ink-primary/55">
            웹툰에 나오는 신위들은 이미 신당에 모셔져 있습니다. 신당에서 신위를 모시고 매일 기도를 올리시면, 연재가
            시작될 때 그 이야기가 훨씬 가깝게 읽히실 겁니다.
          </p>
          <Link
            href="/protected/shrine"
            className="mt-4 flex items-center justify-between rounded-xl border border-gold-500/35 bg-gold-500/[0.08] px-4 py-3"
          >
            <span className="font-serif text-[13px] font-bold text-gold-200">나의 신당으로</span>
            <ChevronRight className="h-4 w-4 text-gold-300/70" />
          </Link>
        </div>
      </div>
    </div>
  )
}
