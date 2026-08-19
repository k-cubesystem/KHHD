import Link from 'next/link'
import { CalendarDays, ChevronRight } from 'lucide-react'

/**
 * 「명식이 없습니다」 — 생년월일이 없는 대상으로 풀이를 열었을 때.
 *
 * ## 🔴 왜 화면을 따로 만들었나
 * 예전에는 명식이 없어도 **풀이가 그냥 시작됐다.** 로딩 화면이 돌고, 복채를 먼저 차감하려다
 * 실패하고, 사람에게는 「복채를 충전하면 이용할 수 있어요」가 떴다 — 지갑에 복채가 있는데도.
 * 문제는 복채가 아니라 **생년월일이 없다는 것**이었는데 화면이 엉뚱한 곳을 가리켰다.
 *
 * 그래서 두 가지를 지킨다 —
 *   ① **차감보다 먼저** 확인한다. 돌 수 없는 풀이에는 값을 매기지 않는다.
 *   ② 무엇이 없는지 그대로 말하고, **그것을 채우는 화면**으로 보낸다.
 */
export function MissingBirthChart({
  targetName,
  isSelf,
}: {
  targetName: string
  /** 본인이면 프로필로, 등록한 인연이면 가족·지인 화면으로 보낸다. */
  isSelf: boolean
}) {
  const href = isSelf ? '/protected/settings' : '/protected/family'
  const cta = isSelf ? '내 명식 입력하기' : '인연 정보 수정하기'

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center px-5 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-gold-500/25 bg-gold-500/[0.07]">
        <CalendarDays className="h-6 w-6 text-gold-500" aria-hidden />
      </div>

      <h1 className="mt-5 font-serif text-xl font-bold text-ink-light">명식이 없습니다</h1>

      <p className="mt-2.5 break-keep font-sans text-[13px] leading-relaxed text-ink-light/55">
        {isSelf ? '아직 생년월일을 넣지 않으셨습니다.' : `${targetName} 님의 생년월일이 아직 없습니다.`}
        <br />
        사주는 태어난 날과 시각으로 세우는 것이라, 그것부터 있어야 풀 수 있습니다.
      </p>

      <p className="mt-3 font-sans text-[11.5px] text-ink-light/35">복채는 아직 쓰이지 않았습니다.</p>

      <Link
        href={href}
        className="mt-7 inline-flex min-h-[48px] w-full items-center justify-center gap-1.5 rounded-xl bg-gold-500 px-5 font-serif text-sm font-bold text-ink-950 transition-colors hover:bg-gold-400"
      >
        {cta}
        <ChevronRight className="h-4 w-4" aria-hidden />
      </Link>

      <Link
        href="/protected/analysis"
        className="mt-3 font-sans text-[12px] text-ink-light/40 transition-colors hover:text-gold-300"
      >
        다른 풀이 보러 가기
      </Link>
    </div>
  )
}
