import { Solar, Lunar } from "lunar-javascript";

// ======== 타입 정의 ========

export interface SajuPillar {
    gan: string; // 천간 (e.g., 甲)
    zhi: string; // 지지 (e.g., 子)
    ganji: string; // 간지 (e.g., 甲子)
    element: string; // 오행 (e.g., 木)
    ganElement: string; // 천간 오행
    zhiElement: string; // 지지 오행
}

export interface SajuData {
    pillars: {
        year: SajuPillar;
        month: SajuPillar;
        day: SajuPillar;
        time: SajuPillar;
        hour: SajuPillar; // time과 동일
    };
    ganjiList: string[]; // [년, 월, 일, 시] 간지 리스트
    elementsDistribution: Record<string, number>; // 오행 분포 (e.g., { "木": 2, "火": 1, ... })
    dayMaster: string; // 일간 (본인을 나타내는 천간)
    dayMasterElement: string; // 일간 오행
    // 추가 필드 (saju-analysis.ts와 호환)
    dayGan: string; // dayMaster와 동일
    monthZhi: string; // 월지
    yearZhi: string; // 연지
    dayZhi: string; // 일지
}

export interface DaeunData {
    age: number;
    ganji: string;
    element: string;
    score: number;
    description?: string;
}

export interface JieqiInfo {
    name: string;
    dateString: string;
}

// ======== 상수 정의 ========

// 천간 목록
const GAN_LIST = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];

// 지지 목록
const ZHI_LIST = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

// 천간 오행 매핑
const GAN_WUXING: Record<string, string> = {
    "甲": "木", "乙": "木",
    "丙": "火", "丁": "火",
    "戊": "土", "己": "土",
    "庚": "金", "辛": "金",
    "壬": "水", "癸": "水",
};

// 지지 오행 매핑
const ZHI_WUXING: Record<string, string> = {
    "子": "水", "丑": "土",
    "寅": "木", "卯": "木",
    "辰": "土", "巳": "火",
    "午": "火", "未": "土",
    "申": "金", "酉": "金",
    "戌": "土", "亥": "水",
};

// 시주(時柱) 계산용 지지 시간 범위
const ZHI_TIME_RANGES: Array<{ zhi: string; start: number; end: number }> = [
    { zhi: "子", start: 23, end: 1 },  // 23:00 ~ 00:59 (자시 - 자정 포함)
    { zhi: "丑", start: 1, end: 3 },   // 01:00 ~ 02:59
    { zhi: "寅", start: 3, end: 5 },   // 03:00 ~ 04:59
    { zhi: "卯", start: 5, end: 7 },   // 05:00 ~ 06:59
    { zhi: "辰", start: 7, end: 9 },   // 07:00 ~ 08:59
    { zhi: "巳", start: 9, end: 11 },  // 09:00 ~ 10:59
    { zhi: "午", start: 11, end: 13 }, // 11:00 ~ 12:59
    { zhi: "未", start: 13, end: 15 }, // 13:00 ~ 14:59
    { zhi: "申", start: 15, end: 17 }, // 15:00 ~ 16:59
    { zhi: "酉", start: 17, end: 19 }, // 17:00 ~ 18:59
    { zhi: "戌", start: 19, end: 21 }, // 19:00 ~ 20:59
    { zhi: "亥", start: 21, end: 23 }, // 21:00 ~ 22:59
];

// 오행 색상 (디자인 시스템 통일)
export const WU_XING_COLORS: Record<string, string> = {
    "木": "#4A7C59", // Green (Wood)
    "火": "#C07055", // Red (Fire)
    "土": "#C5B358", // Gold (Earth)
    "金": "#989390", // Silver (Metal)
    "水": "#4A5D7C", // Blue (Water)
};

// 오행 한글명
export const WU_XING_NAMES: Record<string, string> = {
    "木": "목(木)",
    "火": "화(火)",
    "土": "토(土)",
    "金": "금(金)",
    "水": "수(水)",
};

// ======== 핵심 함수 ========

/**
 * 시간에 따른 지지(地支) 결정 - 자정(23:00-01:00) 경계 처리 포함
 */
function getTimeZhi(hour: number): string {
    // 자시(子時)는 23:00~00:59 - 특수 처리 필요
    if (hour >= 23 || hour < 1) return "子";
    if (hour >= 1 && hour < 3) return "丑";
    if (hour >= 3 && hour < 5) return "寅";
    if (hour >= 5 && hour < 7) return "卯";
    if (hour >= 7 && hour < 9) return "辰";
    if (hour >= 9 && hour < 11) return "巳";
    if (hour >= 11 && hour < 13) return "午";
    if (hour >= 13 && hour < 15) return "未";
    if (hour >= 15 && hour < 17) return "申";
    if (hour >= 17 && hour < 19) return "酉";
    if (hour >= 19 && hour < 21) return "戌";
    return "亥"; // 21:00 ~ 22:59
}

/**
 * 자정(23:00-00:00) 이후인 경우 다음 날로 처리해야 하는지 확인
 * 전통 사주학에서는 자시(子時, 23:00-01:00)의 경우:
 * - 야자시(夜子時, 23:00-24:00): 다음 날로 계산
 * - 정자시(正子時, 00:00-01:00): 당일로 계산
 */
function adjustForMidnight(
    year: number,
    month: number,
    day: number,
    hour: number
): { year: number; month: number; day: number } {
    // 야자시(23:00-24:00)는 다음 날로 처리
    if (hour >= 23) {
        const date = new Date(year, month - 1, day);
        date.setDate(date.getDate() + 1);
        return {
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            day: date.getDate(),
        };
    }
    return { year, month, day };
}

/**
 * 생년월일시를 사주(간지)로 변환합니다.
 * @param date - 'YYYY-MM-DD' 형식
 * @param time - 'HH:mm' 형식
 * @param isSolar - true면 양력, false면 음력
 */
export function getSajuData(
    date: string,
    time: string,
    isSolar: boolean = true
): SajuData {
    const [y, m, d] = date.split("-").map(Number);
    const [hh, mm] = time.split(":").map(Number);

    // 자정 경계 처리
    const adjusted = adjustForMidnight(y, m, d, hh);

    let lunar: Lunar;
    if (isSolar) {
        const solar = Solar.fromYmdHms(
            adjusted.year,
            adjusted.month,
            adjusted.day,
            hh,
            mm,
            0
        );
        lunar = solar.getLunar();
    } else {
        lunar = Lunar.fromYmd(adjusted.year, adjusted.month, adjusted.day);
    }

    const eightChar = lunar.getEightChar();

    const ganjiList = [
        eightChar.getYear(),
        eightChar.getMonth(),
        eightChar.getDay(),
        eightChar.getTime(),
    ];

    // 오행 분포 계산
    const dist: Record<string, number> = { "木": 0, "火": 0, "土": 0, "金": 0, "水": 0 };

    ganjiList.forEach((ganji) => {
        const gan = ganji.charAt(0);
        const zhi = ganji.charAt(1);
        const ganElement = GAN_WUXING[gan];
        const zhiElement = ZHI_WUXING[zhi];
        if (ganElement) dist[ganElement]++;
        if (zhiElement) dist[zhiElement]++;
    });

    const createPillar = (ganjiStr: string): SajuPillar => {
        const gan = ganjiStr.charAt(0);
        const zhi = ganjiStr.charAt(1);
        return {
            gan,
            zhi,
            ganji: ganjiStr,
            element: `${GAN_WUXING[gan]}${ZHI_WUXING[zhi]}`,
            ganElement: GAN_WUXING[gan],
            zhiElement: ZHI_WUXING[zhi],
        };
    };

    const dayPillar = createPillar(eightChar.getDay());

    return {
        pillars: {
            year: createPillar(eightChar.getYear()),
            month: createPillar(eightChar.getMonth()),
            day: dayPillar,
            time: createPillar(eightChar.getTime()),
            hour: createPillar(eightChar.getTime()), // time과 동일
        },
        ganjiList,
        elementsDistribution: dist,
        dayMaster: dayPillar.gan, // 일간 (본인)
        dayMasterElement: dayPillar.ganElement, // 일간 오행
        // 추가 필드
        dayGan: dayPillar.gan,
        monthZhi: createPillar(eightChar.getMonth()).zhi,
        yearZhi: createPillar(eightChar.getYear()).zhi,
        dayZhi: dayPillar.zhi,
    };
}

/**
 * 특정 날짜의 절기 정보를 가져옵니다.
 */
export function getCurrentJieqi(date: string): JieqiInfo | null {
    try {
        const [y, m, d] = date.split("-").map(Number);
        const solar = Solar.fromYmdHms(y, m, d, 12, 0, 0);
        const lunar = solar.getLunar();
        // lunar-javascript 타입 정의가 불완전하여 타입 단언 사용
        const jieqiName = (lunar as unknown as { getJieQi: () => string | null }).getJieQi();

        if (!jieqiName) return null;

        return {
            name: jieqiName,
            dateString: date,
        };
    } catch {
        return null;
    }
}

/**
 * 대운(大運) 계산
 * @param birthDate - 'YYYY-MM-DD'
 * @param birthTime - 'HH:mm'
 * @param gender - 'M' | 'F'
 * @param isSolar - true면 양력
 */
export function calculateDaeun(
    birthDate: string,
    birthTime: string,
    gender: "M" | "F",
    isSolar: boolean = true
): DaeunData[] {
    const sajuData = getSajuData(birthDate, birthTime, isSolar);
    const yearGan = sajuData.pillars.year.gan;

    // 양남양녀: 순행 (1), 음남음녀: 역행 (-1)
    // 양간: 甲, 丙, 戊, 庚, 壬 (짝수 인덱스)
    const ganIndex = GAN_LIST.indexOf(yearGan);
    const isYangGan = ganIndex % 2 === 0;
    const direction =
        (isYangGan && gender === "M") || (!isYangGan && gender === "F") ? 1 : -1;

    // 월주(月柱)의 간지를 기준으로 대운 계산
    const monthGanIndex = GAN_LIST.indexOf(sajuData.pillars.month.gan);
    const monthZhiIndex = ZHI_LIST.indexOf(sajuData.pillars.month.zhi);

    const daeunList: DaeunData[] = [];

    for (let i = 0; i < 10; i++) {
        const age = i * 10;

        // 순행/역행에 따른 대운 간지 계산
        const newGanIndex = (monthGanIndex + direction * (i + 1) + 10) % 10;
        const newZhiIndex = (monthZhiIndex + direction * (i + 1) + 12) % 12;

        const daeunGan = GAN_LIST[newGanIndex];
        const daeunZhi = ZHI_LIST[newZhiIndex];
        const daeunGanji = `${daeunGan}${daeunZhi}`;
        const element = GAN_WUXING[daeunGan];

        // 대운 점수 계산 (일간과의 상생/상극 관계)
        const score = calculateDaeunScore(sajuData.dayMasterElement, element);

        daeunList.push({
            age,
            ganji: daeunGanji,
            element,
            score,
            description: getDaeunDescription(score),
        });
    }

    return daeunList;
}

/**
 * 대운 점수 계산 (일간 오행과 대운 오행의 관계)
 */
function calculateDaeunScore(dayMasterElement: string, daeunElement: string): number {
    // 오행 상생 관계: 木→火→土→金→水→木
    const shengCycle = ["木", "火", "土", "金", "水"];

    // 오행 상극 관계: 木→土, 土→水, 水→火, 火→金, 金→木
    const keMap: Record<string, string> = {
        "木": "土",
        "土": "水",
        "水": "火",
        "火": "金",
        "金": "木",
    };

    const dayIndex = shengCycle.indexOf(dayMasterElement);
    const daeunIndex = shengCycle.indexOf(daeunElement);

    // 같은 오행 (비견/겁재)
    if (dayMasterElement === daeunElement) {
        return 70 + Math.floor(Math.random() * 10);
    }

    // 상생 관계 (생아 - 내가 낳는 오행)
    if (shengCycle[(dayIndex + 1) % 5] === daeunElement) {
        return 75 + Math.floor(Math.random() * 15);
    }

    // 상생 관계 (생나 - 나를 낳는 오행) - 인성
    if (shengCycle[(dayIndex + 4) % 5] === daeunElement) {
        return 80 + Math.floor(Math.random() * 15);
    }

    // 상극 관계 (극아 - 나를 극하는 오행) - 관성
    if (keMap[daeunElement] === dayMasterElement) {
        return 55 + Math.floor(Math.random() * 15);
    }

    // 상극 관계 (극나 - 내가 극하는 오행) - 재성
    if (keMap[dayMasterElement] === daeunElement) {
        return 65 + Math.floor(Math.random() * 15);
    }

    return 70 + Math.floor(Math.random() * 10);
}

/**
 * 대운 점수에 따른 설명 생성
 */
function getDaeunDescription(score: number): string {
    if (score >= 90) return "최상의 운기! 모든 일이 순조롭게 풀립니다.";
    if (score >= 80) return "좋은 운기입니다. 적극적으로 도전하세요.";
    if (score >= 70) return "평균 이상의 운기. 꾸준히 노력하면 성과가 있습니다.";
    if (score >= 60) return "보통의 운기. 무리하지 않는 것이 좋습니다.";
    if (score >= 50) return "조심이 필요한 시기. 건강과 인간관계에 주의하세요.";
    return "어려운 시기. 인내하며 때를 기다리세요.";
}

/**
 * 오행 균형 분석
 */
export function analyzeElementBalance(
    distribution: Record<string, number>
): {
    strongest: string;
    weakest: string;
    lacking: string[];
    excess: string[];
    advice: string;
} {
    const entries = Object.entries(distribution);
    const sorted = entries.sort((a, b) => b[1] - a[1]);

    const strongest = sorted[0][0];
    const weakest = sorted[sorted.length - 1][0];
    const lacking = entries.filter(([, v]) => v === 0).map(([k]) => k);
    const excess = entries.filter(([, v]) => v >= 4).map(([k]) => k);

    let advice = "";
    if (lacking.length > 0) {
        advice = `${lacking.map((e) => WU_XING_NAMES[e]).join(", ")} 기운이 부족합니다. 해당 오행을 보충하는 것이 좋습니다.`;
    } else if (excess.length > 0) {
        advice = `${excess.map((e) => WU_XING_NAMES[e]).join(", ")} 기운이 과다합니다. 균형을 위해 설기(洩氣)가 필요합니다.`;
    } else {
        advice = "오행이 비교적 균형을 이루고 있습니다.";
    }

    return { strongest, weakest, lacking, excess, advice };
}

/**
 * 나이 계산 (만 나이)
 */
export function calculateAge(birthDate: string): number {
    const [birthYear, birthMonth, birthDay] = birthDate.split("-").map(Number);
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();

    let age = todayYear - birthYear;

    // 생일이 아직 안 지났으면 -1
    if (todayMonth < birthMonth || (todayMonth === birthMonth && todayDay < birthDay)) {
        age--;
    }

    return age;
}
