import { Solar } from "lunar-javascript";

// Accurate Solar Terms for a given year
export function getAccurateSolarTerms(year: number) {
    const solarTerms: { name: string, date: string }[] = [];
    // (Implementation Placeholder)
    return solarTerms;
}

// Convert Solar to Lunar with accurate time
export function convertSolarToLunar(year: number, month: number, day: number) {
    // 라이브러리 타입 정의 불일치로 인한 any 캐스팅
    const solar = (Solar as any).fromYmd(year, month, day);
    const lunar = solar.getLunar();
    return {
        lunarYear: lunar.getYear(),
        lunarMonth: lunar.getMonth(),
        lunarDay: lunar.getDay(),
        isLeap: lunar.isLeap()
    };
}

// Check if valid date
export function isValidDate(year: number, month: number, day: number): boolean {
    try {
        (Solar as any).fromYmd(year, month, day);
        return true;
    } catch (e) {
        return false;
    }
}
