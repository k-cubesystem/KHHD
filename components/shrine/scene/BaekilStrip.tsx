'use client'

import Link from 'next/link'
import { Flame } from 'lucide-react'
import type { BaekilStatus } from '@/app/actions/shrine/rituals'

/**
 * 백일기도 게이지 — 신당 방 위 한 줄 (CEO 6차 지시 2026-07-30).
 *
 * 이 자리에는 「主神 ○○ · 緣 …」 인연 스트립과 「기원 N단」 스트립이 있었다. 둘 다 걷어내고
 * 백일기도 진행도 하나만 남긴 이유는 지시 그대로다 — "용왕신, 기원0단 이 내용 빼주고
 * 여기에 100일기도를 게이지로 넣어줘". 신위 이름은 방 안 말풍선 머리(신당지기 · ○○)에도
 * 늘 떠 있어 한 화면에 두 번 적히던 셈이기도 하다.
 *
 * ⚠️ **진행도를 여기서 다시 계산하지 않는다.** percent·earnedDays·targetDays·round·phase 는
 *    전부 서버(getBaekilStatus → lib/domain/ritual/baekil.ts)가 판정한 값이다. 화면이 같은 계산을
 *    한 벌 더 들면 둘이 어긋나는 순간 "게이지는 100인데 완주가 안 되는" 상태가 된다
 *    (백일기도 화면 baekil-client.tsx 와 같은 규율).
 *
 * ⚠️ 서약이 없을 때(phase='none') 게이지 대신 **시작 유도**를 그린다. 0% 막대를 보여 주면
 *    "아직 서약하지 않은 사람"과 "오늘 서약해 0일 쌓은 사람"이 화면에서 구분되지 않고,
 *    무엇보다 눌러야 할 이유를 말하지 않는 빈 막대가 된다. 시작 자체(startBaekilVow)는 여기서
 *    부르지 않는다 — 서약은 「소원을 적어 보내지 않는다」는 고지와 회차 안내를 먼저 읽히고
 *    눌러야 하는 약속이라 전용 페이지가 맡는다. 이 줄은 그 문을 열어 줄 뿐이다.
 */
export function BaekilStrip({ status }: { status: BaekilStatus }) {
  const { progress, completedCount } = status
  const started = progress.phase !== 'none'
  /** 휴면(30일 무기도)은 실패가 아니다 — 막대는 그대로 두고 불씨만 사그라뜨려 알린다. */
  const burning = progress.phase === 'active' || progress.phase === 'ready'

  return (
    <Link
      href="/protected/shrine/baekil"
      aria-label={started ? '백일기도 진행 보기' : '백일기도 시작하기'}
      className="mb-2 flex w-full items-center gap-2 rounded-[10px] border border-gold-500/20 bg-surface/60 px-2.5 py-1.5"
    >
      <span
        className="grid h-5 w-5 flex-shrink-0 place-items-center rounded-full"
        style={{
          background: burning ? 'rgba(201,168,76,0.18)' : 'rgba(255,255,255,0.04)',
          boxShadow: burning ? '0 0 9px rgba(201,168,76,0.4)' : 'none',
        }}
      >
        <Flame
          className="h-3 w-3"
          style={{ color: burning ? '#E8D5A0' : '#5C564C' }}
          fill={burning ? '#C9A84C' : 'none'}
        />
      </span>

      <span className="whitespace-nowrap font-serif text-[11px] text-gold-200">
        백일기도<span className="text-gold-500/60"> 禱</span>
      </span>

      {started ? (
        <>
          {progress.round > 1 && (
            <span className="whitespace-nowrap rounded-full bg-gold-500/15 px-1.5 py-0.5 font-serif text-[9px] tabular-nums text-gold-300">
              {progress.round}회차
            </span>
          )}
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-primary/15">
            <div className="h-full rounded-full bg-gold-500 transition-all" style={{ width: `${progress.percent}%` }} />
          </div>
          <span className="whitespace-nowrap font-serif text-[9.5px] tabular-nums text-ink-primary/45">
            {progress.earnedDays}/{progress.targetDays}일
          </span>
          {progress.ready && (
            <span className="grid h-[15px] flex-shrink-0 place-items-center rounded-full bg-seal px-1.5 text-[9px] font-bold text-[#f2dcdc]">
              갈무리
            </span>
          )}
        </>
      ) : (
        <>
          <span className="flex-1 truncate text-left font-sans text-[10px] text-ink-primary/45">
            {completedCount > 0 ? '다음 회차를 시작할 수 있습니다' : '하루 한 번, 백 일의 기도를 시작합니다'}
          </span>
          <span className="whitespace-nowrap font-serif text-[9.5px] text-gold-300/80">시작하기</span>
        </>
      )}
    </Link>
  )
}
