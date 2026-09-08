'use client'

import Link from 'next/link'
import { useSyncExternalStore } from 'react'
import { ChevronRight, BookmarkCheck } from 'lucide-react'

/**
 * 이어보기 바 — 목록 상단에서 «읽던 화»로 바로 보낸다.
 *
 * 출처 둘을 합친다: 이 브라우저(localStorage — 비로그인 포함, WebtoonTrack 이 기록)와
 * 서버(로그인 유저의 기기 간 동기화). 브라우저 기록이 있으면 그것이 최신 행동이므로 우선한다.
 * localStorage 는 useSyncExternalStore 로 읽는다 — 렌더 중 비순수 호출·effect setState 를 피하는 규약.
 */
const STORE_KEY = 'hhd_webtoon_last'

function readLocal(): number | null {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return null
    const n = Number(JSON.parse(raw)?.no)
    return Number.isInteger(n) && n >= 0 ? n : null
  } catch {
    return null
  }
}

const subscribe = () => () => {}

export function WebtoonContinue({ serverLast }: { serverLast: number | null }) {
  const localLast = useSyncExternalStore(subscribe, readLocal, () => null)
  const last = localLast ?? serverLast
  if (last === null) return null
  return (
    <Link
      href={`/webtoon/${last}`}
      className="flex items-center justify-between rounded-2xl border border-gold-500/35 bg-gold-500/[0.08] px-4 py-3"
    >
      <span className="flex items-center gap-2 font-serif text-[13px] font-bold text-gold-200">
        <BookmarkCheck className="h-4 w-4" />
        이어보기 — {last === 0 ? '예고편' : `${last}화`}부터
      </span>
      <ChevronRight className="h-4 w-4 text-gold-300/70" />
    </Link>
  )
}
