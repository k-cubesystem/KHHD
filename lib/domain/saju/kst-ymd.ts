/**
 * 서울 달력의 «오늘» — 서버 시간대와 무관하게 센다. 만세력 라이브러리를 끌어오지 않는 가벼운 모듈이라
 * 브라우저에서 import 하는 도메인 파일(3초 사주·웹툰 진맥)도 쓴다.
 *
 * 🔴 Vercel 함수는 UTC 라 `new Date().getFullYear()`·`getMonth()`·`getDate()` 는 서울 자정~오전 9시에 전날이다
 *    (로컬·jest 는 서울이라 안 보인다). 시각을 받아 서울 달력으로 바꾸는 이 함수만 쓴다.
 * 입춘을 지나야 바뀌는 «세운 연도»는 `seun-year.ts`.
 */
import { kstDateKey } from '@/lib/domain/analysis/wallpaper'

export interface KstYmd {
  year: number
  month: number
  day: number
}

export function kstYmd(now: Date): KstYmd {
  const [year, month, day] = kstDateKey(now).split('-').map(Number)
  return { year, month, day }
}
