import Link from 'next/link'
import Image from 'next/image'
import { BookOpen, ChevronRight, Lock as LockIcon, PenLine } from 'lucide-react'
import { listEpisodes, listMyStories } from '@/app/actions/webtoon/webtoon'
import { STORY_STATUS_LABEL } from '@/lib/domain/webtoon/story'

export const metadata = { title: '웹툰' }

/**
 * 웹툰 — 회차 목록 + 「내 이야기 쓰기」 진입.
 *
 * ⚠️ 회차가 아직 없어도 **빈 화면을 두지 않는다**. 내비에 자리를 차지한 칸이 비어 있으면
 *    그 자체가 결함으로 읽힌다 — 무엇이 오는지 말하고, 그동안 할 수 있는 일(내 이야기)을 연다.
 * ⚠️ 내 사연 목록은 **본인 것만** 뜬다(서버 액션이 본인 스코프로만 조회한다). 남의 사연은
 *    개수조차 화면에 나오지 않는다.
 */
export default async function WebtoonPage() {
  const [episodes, myStories] = await Promise.all([listEpisodes(), listMyStories()])

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto w-full max-w-[480px] space-y-5">
        <header className="text-center">
          <p className="font-serif text-[10px] tracking-[0.4em] text-gold-500/60">連 載</p>
          <h1 className="mt-1 font-serif text-2xl font-bold text-ink-primary">청담해화당</h1>
          <p className="mt-2 font-sans text-[13px] text-ink-primary/50">공식 웹툰</p>
        </header>

        {episodes.length === 0 ? (
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
        ) : (
          <ul className="space-y-2.5">
            {episodes.map((ep) => (
              <li key={ep.id}>
                <Link
                  href={`/protected/webtoon/${ep.no}`}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-surface/50 p-3"
                >
                  <span className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-black/30">
                    {ep.thumbUrl ? (
                      <Image src={ep.thumbUrl} alt="" fill sizes="64px" className="object-cover" />
                    ) : (
                      <span className="grid h-full w-full place-items-center font-serif text-[15px] text-gold-500/50">
                        {ep.no}
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="font-serif text-[10px] tracking-[0.2em] text-gold-500/60">
                        {ep.no === 0 ? '예고편' : `${ep.no}화`}
                      </span>
                      {ep.access === 'membership' ? (
                        <span className="inline-flex items-center gap-0.5 rounded-full border border-gold-500/35 bg-gold-500/[0.08] px-1.5 py-px font-sans text-[9px] font-bold text-gold-300">
                          <LockIcon className="h-2.5 w-2.5" />
                          멤버십
                        </span>
                      ) : (
                        <span className="rounded-full border border-white/15 px-1.5 py-px font-sans text-[9px] text-ink-primary/45">
                          무료
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate font-serif text-[14px] font-bold text-ink-primary">
                      {ep.title}
                    </span>
                    {ep.summary && (
                      <span className="mt-0.5 block truncate font-sans text-[11.5px] text-ink-primary/45">
                        {ep.summary}
                      </span>
                    )}
                  </span>
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-ink-primary/30" />
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* 내 이야기 쓰기 — 연재 전에도 열려 있다. 사연이 쌓여야 그릴 것이 생긴다 */}
        <Link
          href="/protected/webtoon/story"
          className="flex items-center justify-between rounded-2xl border border-gold-500/35 bg-gold-500/[0.08] px-4 py-4"
        >
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 font-serif text-[14px] font-bold text-gold-200">
              <PenLine className="h-4 w-4" />내 이야기 쓰기
            </span>
            <span className="mt-1 block font-sans text-[11.5px] leading-relaxed text-ink-primary/50">
              선정되면 웹툰의 한 화로 그려 드립니다 · 비공개로 접수됩니다
            </span>
          </span>
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-gold-300/70" />
        </Link>

        {myStories.length > 0 && (
          <section className="rounded-2xl border border-white/10 bg-surface/50 p-4">
            <p className="font-serif text-[11px] tracking-[0.2em] text-gold-500/60">내가 보낸 이야기</p>
            <ul className="mt-2.5 space-y-2">
              {myStories.map((s) => (
                <li key={s.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 flex-1 truncate font-serif text-[12.5px] text-ink-primary/70">
                      {s.title}
                    </span>
                    <span className="flex-shrink-0 font-sans text-[11px] text-gold-300/70">
                      {STORY_STATUS_LABEL[s.status]}
                    </span>
                  </div>
                  {/* 회신 — 읽었으면 답한다는 약속의 실체. 있을 때만 뜬다 */}
                  {s.replyNote && (
                    <p className="mt-1.5 rounded-lg border border-gold-500/15 bg-gold-500/[0.05] px-2.5 py-2 font-serif text-[12px] leading-relaxed text-gold-200/85">
                      {s.replyNote}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
