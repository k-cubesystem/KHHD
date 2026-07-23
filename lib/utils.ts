import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// This check can be removed, it is just for tutorial purposes
export const hasEnvVars = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

// SSR(UTC)·클라이언트(로컬) 어디서 실행해도 동일 출력 — 하이드레이션 일치를 위해 KST(UTC+9) 고정
const KST_OFFSET_MS = 9 * 60 * 60 * 1000

export function formatKstDateTime(value: string | Date): string {
  const time = new Date(value).getTime()
  if (Number.isNaN(time)) return ''
  const kst = new Date(time + KST_OFFSET_MS)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${kst.getUTCFullYear()}.${pad(kst.getUTCMonth() + 1)}.${pad(kst.getUTCDate())} ${pad(kst.getUTCHours())}:${pad(kst.getUTCMinutes())}`
}

/**
 * KST(UTC+9) 기준 날짜 문자열 "YYYY-MM-DD". 서버·클라 동일 출력.
 * 출석·정성 등 '일(day)' 단위 판정 공용(attendance.ts getKSTDateString 미러).
 */
export function formatKstDate(value: string | number | Date = Date.now()): string {
  const time = new Date(value).getTime()
  if (Number.isNaN(time)) return ''
  return new Date(time + KST_OFFSET_MS).toISOString().split('T')[0]
}

/** 짧은 KST 포맷 "M.D HH:mm" — 알림 등 연도 생략. 하이드레이션 안전(위와 동일 오프셋 계산). */
export function formatKstShort(value: string | Date): string {
  const time = new Date(value).getTime()
  if (Number.isNaN(time)) return ''
  const kst = new Date(time + KST_OFFSET_MS)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${kst.getUTCMonth() + 1}.${kst.getUTCDate()} ${pad(kst.getUTCHours())}:${pad(kst.getUTCMinutes())}`
}

export function toConversationalTone(text: string): string {
  // Simple heuristic mapping for now, can be expanded with AI later
  const endings = {
    '합니다.': '해요.',
    '입니다.': '이에요.',
    '하십시오.': '해보세요.',
    '않습니다.': '않아요.',
    '됩니다.': '돼요.',
    '없습니다.': '없어요.',
    '있습니다.': '있어요.',
  }

  let newText = text
  Object.entries(endings).forEach(([formal, casual]) => {
    newText = newText.replace(new RegExp(formal, 'g'), casual)
  })

  return newText
}
