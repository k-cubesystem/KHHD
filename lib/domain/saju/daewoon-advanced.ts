/**
 * 대운(大運) 고급 계산
 * 입춘 기준 정확한 대운 시작 나이 계산
 */

import { Solar, Lunar } from 'lunar-javascript'

/**
 * 대운 시작 나이 정확 계산
 *
 * 원리:
 * - 출생일부터 다음 절기(입춘, 경칩 등)까지의 일수를 계산
 * - 3일 = 1년 공식 적용
 * - 순행/역행 여부에 따라 방향 결정
 *
 * @param birthDate 생년월일 (YYYY-MM-DD)
 * @param birthTime 태어난 시간 (HH:mm)
 * @param gender 성별 (male/female)
 * @param timezone 타임존
 */
export function calculateDaewoonStartAge(
  birthDate: string,
  birthTime: string,
  gender: 'male' | 'female',
  timezone: string = 'Asia/Seoul'
): number {
  const [year, month, day] = birthDate.split('-').map(Number)
  const [hour, minute] = birthTime.split(':').map(Number)

  // Solar 객체 생성
  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0)
  const lunar = solar.getLunar()

  // 양년/음년 판단 (천간이 양간인지 음간인지)
  const eightChar: any = lunar.getEightChar()
  const yearGan = eightChar.getYearGan()
  const yangGans = ['甲', '丙', '戊', '庚', '壬']
  const isYangYear = yangGans.includes(yearGan)

  // 순행/역행 결정
  // 양년 남자, 음년 여자 = 순행
  // 음년 남자, 양년 여자 = 역행
  const isForward = (isYangYear && gender === 'male') || (!isYangYear && gender === 'female')

  // 현재 월의 절기 찾기
  const currentMonth = month
  const solarTermName = getSolarTermForMonth(currentMonth)

  // 절기 시간 찾기
  let targetSolarTerm: Date

  if (isForward) {
    // 순행: 다음 절기까지의 일수
    targetSolarTerm = findNextSolarTerm(solar, solarTermName, year, month, day)
  } else {
    // 역행: 이전 절기까지의 일수
    targetSolarTerm = findPreviousSolarTerm(solar, solarTermName, year, month, day)
  }

  // 출생일과 절기 간 일수 차이 계산
  const birthDateTime = new Date(year, month - 1, day, hour, minute)
  const diffMs = Math.abs(targetSolarTerm.getTime() - birthDateTime.getTime())
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  // 3일 = 1년 공식
  const startAge = Math.floor(diffDays / 3)

  // 최소 1세, 최대 10세로 제한
  return Math.max(1, Math.min(10, startAge))
}

/**
 * 월에 해당하는 절기 이름 반환
 */
function getSolarTermForMonth(month: number): string {
  const solarTerms: Record<number, string> = {
    1: '입춘', // 2월 4일경
    2: '경칩', // 3월 6일경
    3: '청명', // 4월 5일경
    4: '입하', // 5월 6일경
    5: '망종', // 6월 6일경
    6: '소서', // 7월 7일경
    7: '입추', // 8월 8일경
    8: '백로', // 9월 8일경
    9: '한로', // 10월 8일경
    10: '입동', // 11월 7일경
    11: '대설', // 12월 7일경
    12: '소한', // 1월 6일경
  }

  return solarTerms[month] || '입춘'
}

/**
 * 다음 절기 시간 찾기
 */
function findNextSolarTerm(
  solar: Solar,
  termName: string,
  birthYear: number,
  birthMonth: number,
  birthDay: number
): Date {
  // 간단한 근사값 계산
  const termDates: Record<string, [number, number]> = {
    입춘: [2, 4],
    경칩: [3, 6],
    청명: [4, 5],
    입하: [5, 6],
    망종: [6, 6],
    소서: [7, 7],
    입추: [8, 8],
    백로: [9, 8],
    한로: [10, 8],
    입동: [11, 7],
    대설: [12, 7],
    소한: [1, 6],
  }

  const [month, day] = termDates[termName] || [2, 4]
  let termYear = birthYear

  // 현재 날짜가 절기 이후면 다음 해 절기
  const currentDate = `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`
  const termDate = `${termYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  if (currentDate >= termDate) {
    termYear += 1
  }

  return new Date(termYear, month - 1, day, 0, 0, 0)
}

/**
 * 이전 절기 시간 찾기
 */
function findPreviousSolarTerm(
  solar: Solar,
  termName: string,
  birthYear: number,
  birthMonth: number,
  birthDay: number
): Date {
  const termDates: Record<string, [number, number]> = {
    입춘: [2, 4],
    경칩: [3, 6],
    청명: [4, 5],
    입하: [5, 6],
    망종: [6, 6],
    소서: [7, 7],
    입추: [8, 8],
    백로: [9, 8],
    한로: [10, 8],
    입동: [11, 7],
    대설: [12, 7],
    소한: [1, 6],
  }

  const [month, day] = termDates[termName] || [2, 4]
  let termYear = birthYear

  // 현재 날짜가 절기 이전이면 작년 절기
  const currentDate = `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`
  const termDate = `${termYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  if (currentDate < termDate) {
    termYear -= 1
  }

  return new Date(termYear, month - 1, day, 0, 0, 0)
}
