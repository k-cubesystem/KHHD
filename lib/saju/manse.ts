import { Solar, Lunar } from 'lunar-javascript';

export interface SajuPillar {
    gan: string;
    ji: string;
    ganHan: string;
    jiHan: string;
    color: string;
    label: string;
    korean: string; // e.g. "갑자"
    ganElement: string; // 천간의 오행 (Wood, Fire, Earth, Metal, Water)
    jiElement: string; // 지지의 오행 (Wood, Fire, Earth, Metal, Water)
}

export interface ManseResult {
    year: SajuPillar;
    month: SajuPillar;
    day: SajuPillar;
    time: SajuPillar;
}

// Mappings for UI
const GAN_INFO: Record<string, { colorClass: string; element: string; colorName: string }> = {
    "甲": { colorClass: "text-green-600 bg-green-50 border-green-200", element: "Wood", colorName: "청(靑)" }, // Yang Wood
    "乙": { colorClass: "text-green-600 bg-green-50 border-green-200", element: "Wood", colorName: "청(靑)" }, // Yin Wood
    "丙": { colorClass: "text-red-600 bg-red-50 border-red-200", element: "Fire", colorName: "적(赤)" }, // Yang Fire
    "丁": { colorClass: "text-red-600 bg-red-50 border-red-200", element: "Fire", colorName: "적(赤)" }, // Yin Fire
    "戊": { colorClass: "text-yellow-600 bg-yellow-50 border-yellow-200", element: "Earth", colorName: "황(黃)" }, // Yang Earth
    "己": { colorClass: "text-yellow-600 bg-yellow-50 border-yellow-200", element: "Earth", colorName: "황(黃)" }, // Yin Earth
    "庚": { colorClass: "text-gray-600 bg-gray-50 border-gray-200", element: "Metal", colorName: "백(白)" }, // Yang Metal
    "辛": { colorClass: "text-gray-600 bg-gray-50 border-gray-200", element: "Metal", colorName: "백(白)" }, // Yin Metal
    "壬": { colorClass: "text-blue-900 bg-blue-50 border-blue-200", element: "Water", colorName: "흑(黑)" }, // Yang Water
    "癸": { colorClass: "text-blue-900 bg-blue-50 border-blue-200", element: "Water", colorName: "흑(黑)" }, // Yin Water
};

const JI_INFO: Record<string, { animal: string; element: string }> = {
    "子": { animal: "쥐", element: "Water" },
    "丑": { animal: "소", element: "Earth" },
    "寅": { animal: "호랑이", element: "Wood" },
    "卯": { animal: "토끼", element: "Wood" },
    "辰": { animal: "용", element: "Earth" },
    "巳": { animal: "뱀", element: "Fire" },
    "午": { animal: "말", element: "Fire" },
    "未": { animal: "양", element: "Earth" },
    "申": { animal: "원숭이", element: "Metal" },
    "酉": { animal: "닭", element: "Metal" },
    "戌": { animal: "개", element: "Earth" },
    "亥": { animal: "돼지", element: "Water" },
};

const KOREAN_GAN: Record<string, string> = {
    "甲": "갑", "乙": "을", "丙": "병", "丁": "정", "戊": "무",
    "己": "기", "庚": "경", "辛": "신", "壬": "임", "癸": "계"
};

const KOREAN_JI: Record<string, string> = {
    "子": "자", "丑": "축", "寅": "인", "卯": "묘", "辰": "진", "巳": "사",
    "午": "오", "未": "미", "申": "신", "酉": "유", "戌": "술", "亥": "해"
};

function createPillar(gan: string, ji: string): SajuPillar {
    const ganInfo = GAN_INFO[gan] || { colorClass: "text-gray-800 bg-gray-100", element: "Unknown", colorName: "" };
    const jiInfo = JI_INFO[ji] || { animal: "Unknown", element: "Unknown" };

    // Combine color name and animal (e.g. "푸른 용" -> "청룡" styling in UI is separate, but label helps)
    // Label example: "푸른 용" (Blue Dragon)
    const colorLabelMap: Record<string, string> = {
        "청(靑)": "푸른", "적(赤)": "붉은", "황(黃)": "황금", "백(白)": "흰", "흑(黑)": "검은"
    };

    const label = `${colorLabelMap[ganInfo.colorName] || ""} ${jiInfo.animal}`;
    const korean = `${KOREAN_GAN[gan] || gan}${KOREAN_JI[ji] || ji}`;

    return {
        gan,
        ji,
        ganHan: gan,
        jiHan: ji,
        color: ganInfo.colorClass,
        label,
        korean,
        ganElement: ganInfo.element,
        jiElement: jiInfo.element
    };
}

/**
 * Calculates the Four Pillars (Saju) from a given Gregorian date and time.
 * @param dateStr Format: YYYY-MM-DD
 * @param timeStr Format: HH:mm (optional, defaults to 00:00)
 */
export function calculateManse(dateStr: string, timeStr: string = "00:00"): ManseResult {
    // strict parsing
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hour, minute] = timeStr.split(':').map(Number);

    const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
    const lunar = solar.getLunar();

    // lunar-javascript's getEightChar method handles the logic for year/month change based on solar terms (Jeolgi)
    const eightChar: any = lunar.getEightChar();

    // Optional: Configure sect settings if needed (e.g., Zi hour processing)
    // eightChar.setSect(1); // Default is 2 (starts day at 00:00). 1 starts day at 23:00 (Ja-Si)
    // Usually for modern Saju, standard solar date crossing is handled, but classic libraries might differ.
    // We will stick to defaults for now which are robust.

    return {
        year: createPillar(eightChar.getYearGan(), eightChar.getYearZhi()),
        month: createPillar(eightChar.getMonthGan(), eightChar.getMonthZhi()),
        day: createPillar(eightChar.getDayGan(), eightChar.getDayZhi()),
        time: createPillar(eightChar.getTimeGan(), eightChar.getTimeZhi()),
    };
}

/**
 * 대운(大運) 인터페이스
 */
export interface DaewoonPeriod {
    pillar: SajuPillar;
    startAge: number;
    endAge: number;
    startYear: number;
    endYear: number;
    isCurrent: boolean;
}

/**
 * 대운(大運) 계산 - 10년 단위 운세 주기
 * @param birthDate 생년월일 (YYYY-MM-DD)
 * @param birthTime 생시 (HH:mm)
 * @param gender 성별 ('male' | 'female')
 * @param currentAge 현재 나이 (만 나이)
 */
export function calculateDaewoon(
    birthDate: string,
    birthTime: string,
    gender: 'male' | 'female',
    currentAge: number
): DaewoonPeriod[] {
    const [birthYear] = birthDate.split('-').map(Number);
    const manse = calculateManse(birthDate, birthTime);

    // 대운 시작 나이 계산 (간략화: 남자 양년생/여자 음년생은 순행, 반대는 역행)
    // 실제로는 절기 계산이 필요하지만, 여기서는 간소화
    const isYangYear = birthYear % 2 === 0;
    const isForward = (gender === 'male' && isYangYear) || (gender === 'female' && !isYangYear);

    // 대운 시작 나이 (보통 3-8세 사이, 여기서는 간략히 5세로 설정)
    const startAge = 5;

    // 월주 기준으로 대운 계산
    const monthGanIndex = Object.keys(KOREAN_GAN).indexOf(manse.month.gan);
    const monthJiIndex = Object.keys(KOREAN_JI).indexOf(manse.month.ji);

    const daewoonPeriods: DaewoonPeriod[] = [];
    const ganKeys = Object.keys(KOREAN_GAN);
    const jiKeys = Object.keys(KOREAN_JI);

    // 10개의 대운 주기 생성 (100년)
    for (let i = 0; i < 10; i++) {
        const periodStartAge = startAge + (i * 10);
        const periodEndAge = periodStartAge + 9;
        const periodStartYear = birthYear + periodStartAge;
        const periodEndYear = birthYear + periodEndAge;

        // 순행/역행에 따라 천간지지 계산
        let ganIdx, jiIdx;
        if (isForward) {
            ganIdx = (monthGanIndex + i + 1) % 10;
            jiIdx = (monthJiIndex + i + 1) % 12;
        } else {
            ganIdx = (monthGanIndex - i - 1 + 10) % 10;
            jiIdx = (monthJiIndex - i - 1 + 12) % 12;
        }

        const pillar = createPillar(ganKeys[ganIdx], jiKeys[jiIdx]);
        const isCurrent = currentAge >= periodStartAge && currentAge <= periodEndAge;

        daewoonPeriods.push({
            pillar,
            startAge: periodStartAge,
            endAge: periodEndAge,
            startYear: periodStartYear,
            endYear: periodEndYear,
            isCurrent,
        });
    }

    return daewoonPeriods;
}
