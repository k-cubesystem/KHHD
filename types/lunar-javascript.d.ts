declare module 'lunar-javascript' {
  export class Solar {
    static fromYmd(y: number, m: number, d: number): Solar
    static fromYmdHms(y: number, m: number, d: number, h: number, min: number, s: number): Solar
    getLunar(): Lunar
    getYear(): number
    getMonth(): number
    getDay(): number
    getHour(): number
    getMinute(): number
    getSecond(): number
    toYmd(): string
    toYmdHms(): string
  }
  export class Lunar {
    static fromYmd(y: number, m: number, d: number): Lunar
    static fromYmdHms(y: number, m: number, d: number, h: number, min: number, s: number): Lunar
    getEightChar(): EightChar
    getSolar(): Solar
    getYear(): number
    getMonth(): number
    getDay(): number
    getYearInGanZhi(): string
    getMonthInGanZhi(): string
    getDayInGanZhi(): string
    getJieQi(): string
    getJieQiTable(): Record<string, Solar>
  }
  export class EightChar {
    /** 자시 유파: 1 = 야자시(23시~) 일주를 다음날로, 2 = 당일 유지 (기본 2) */
    setSect(sect: number): void
    getSect(): number
    getYear(): string
    getMonth(): string
    getDay(): string
    getTime(): string
    getYearGan(): string
    getYearZhi(): string
    getMonthGan(): string
    getMonthZhi(): string
    getDayGan(): string
    getDayZhi(): string
    getTimeGan(): string
    getTimeZhi(): string
    getYearWuXing(): string
    getMonthWuXing(): string
    getDayWuXing(): string
    getTimeWuXing(): string
    /** gender: 1 = 남, 0 = 여 */
    getYun(gender: number, sect?: number): Yun
  }
  export class Yun {
    isForward(): boolean
    /** 출생 후 대운 시작까지의 오프셋 (년/월/일/시) */
    getStartYear(): number
    getStartMonth(): number
    getStartDay(): number
    getStartHour(): number
    getStartSolar(): Solar
    /** index 0은 대운 시작 전(원국) 구간 — getGanZhi()가 빈 문자열 */
    getDaYun(n?: number): DaYun[]
  }
  export class DaYun {
    getStartYear(): number
    getEndYear(): number
    /** 세는나이 기준 시작/종료 나이 */
    getStartAge(): number
    getEndAge(): number
    getIndex(): number
    getGanZhi(): string
  }
}
