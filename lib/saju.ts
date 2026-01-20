import { Solar, Lunar, EightChar } from "lunar-javascript";

export interface SajuPillar {
    gan: string; // 천간 (e.g., 甲)
    zhi: string; // 지지 (e.g., 子)
    ganji: string; // 간지 (e.g., 甲子)
    element: string; // 오행 (e.g., 木)
}

export interface SajuData {
    pillars: {
        year: SajuPillar;
        month: SajuPillar;
        day: SajuPillar;
        time: SajuPillar;
    };
    ganjiList: string[]; // [년, 월, 일, 시] 간지 리스트
    elementsDistribution: Record<string, number>; // 오행 분포 (e.g., { "木": 2, "火": 1, ... })
}

/**
 * 생년월일을 사주(간지)로 변환합니다.
 */
export function getSajuData(
    date: string, // 'YYYY-MM-DD'
    time: string, // 'HH:mm'
    isSolar: boolean = true
): SajuData {
    const [y, m, d] = date.split("-").map(Number);
    const [hh, mm] = time.split(":").map(Number);

    let lunar: Lunar;
    if (isSolar) {
        const solar = Solar.fromYmdHms(y, m, d, hh, mm, 0);
        lunar = solar.getLunar();
    } else {
        // 음력일 경우 시간 처리는 Solar로 역변환하거나 Lunar.fromYmd 사용
        lunar = Lunar.fromYmd(y, m, d);
        // 시간 정보가 필요하면 lunar 객체의 메서드로 추가 설정 가능하나 
        // EightChar 계산 시 60갑자 추출에는 날짜가 핵심
    }

    const eightChar = lunar.getEightChar();
    const ganji = [
        eightChar.getYear(),
        eightChar.getMonth(),
        eightChar.getDay(),
        eightChar.getTime(),
    ];

    const wuxing = [
        eightChar.getYearWuXing(),
        eightChar.getMonthWuXing(),
        eightChar.getDayWuXing(),
        eightChar.getTimeWuXing(),
    ];

    const dist: Record<string, number> = { "木": 0, "火": 0, "土": 0, "金": 0, "水": 0 };
    wuxing.forEach((w) => {
        // wuxing format is usually "GanWuXing ZhiWuXing" like "木 木"
        const [ganW, zhiW] = w.split(""); // lunar-javascript gives them as "木火" or similar concat
        dist[ganW]++;
        dist[zhiW]++;
    });

    const createPillar = (ganjiStr: string, wuxingStr: string): SajuPillar => ({
        gan: ganjiStr.charAt(0),
        zhi: ganjiStr.charAt(1),
        ganji: ganjiStr,
        element: wuxingStr, // Usually the main element (Day Gan) is important, but here we store string
    });

    return {
        pillars: {
            year: createPillar(eightChar.getYear(), eightChar.getYearWuXing()),
            month: createPillar(eightChar.getMonth(), eightChar.getMonthWuXing()),
            day: createPillar(eightChar.getDay(), eightChar.getDayWuXing()),
            time: createPillar(eightChar.getTime(), eightChar.getTimeWuXing()),
        },
        ganjiList: ganji,
        elementsDistribution: dist,
    };
}

export const WU_XING_COLORS: Record<string, string> = {
    "木": "#2ECC71",
    "火": "#E74C3C",
    "土": "#F1C40F",
    "金": "#ECF0F1",
    "水": "#34495E",
};
