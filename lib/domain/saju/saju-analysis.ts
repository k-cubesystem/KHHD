/**
 * 사주 프리미엄 분석 유틸리티
 * 격국, 신살, 용신, 육친, 대운 등 전문 분석 로직
 */

import { SajuData } from './saju';

// ==================== 타입 정의 ====================

export interface GekgukAnalysis {
    gekguk: string; // 격국 이름 (예: "정관격")
    hanja: string; // 한자 (예: "正官格")
    strength: number; // 1-5 (약격-강격)
    strengthLabel: string; // "약격", "중격", "강격"
    description: string; // 격국 특징 설명
    characteristics: string[]; // 격국 특성 리스트
}

export interface SinsalItem {
    name: string; // 신살 이름 (예: "역마살")
    hanja: string; // 한자 (예: "驛馬殺")
    type: 'good' | 'neutral' | 'bad'; // 길신, 중립, 흉신
    category: string; // 카테고리 (예: "이동", "귀인", "예술")
    description: string; // 상세 설명
    influence: string; // 영향력 설명
}

export interface YongsinAnalysis {
    yongsin: string; // 용신 오행 (예: "木")
    yongsinKorean: string; // 한글 (예: "목")
    huisin: string; // 희신 오행
    huisinKorean: string;
    gisin: string; // 기신 오행
    gisinKorean: string;
    yongsinReason: string; // 용신 선정 이유
    recommendation: string; // 활용 권장사항
}

export interface YukchinAnalysis {
    [key: string]: {
        name: string; // 육친 이름
        hanja: string; // 한자
        count: number; // 개수
        pillars: string[]; // 위치 (예: ["년간", "일지"])
        strength: 'weak' | 'moderate' | 'strong'; // 세력
        interpretation: string; // 해석
    }
}

export interface DaeunPeriod {
    startYear: number;
    endYear: number;
    age: string; // "30-39세"
    gan: string; // 천간
    zhi: string; // 지지
    ganjiKorean: string; // 한글 (예: "갑자")
    element: string; // 주요 오행
    fortune: 'good' | 'neutral' | 'bad'; // 운세 평가
    description: string; // 대운 해석
}

export interface GaeunbubRecommendation {
    luckyElement: string; // 행운의 오행
    colors: string[]; // 행운의 색
    directions: string[]; // 행운의 방위
    numbers: number[]; // 행운의 숫자
    jobs: string[]; // 추천 직업군
    activities: string[]; // 일상 개운법
    avoidElements: string[]; // 피해야 할 오행
}

// ==================== 기본 데이터 ====================

const GANZHI_KOREAN: Record<string, string> = {
    '甲': '갑', '乙': '을', '丙': '병', '丁': '정', '戊': '무',
    '己': '기', '庚': '경', '辛': '신', '壬': '임', '癸': '계',
    '子': '자', '丑': '축', '寅': '인', '卯': '묘', '辰': '진', '巳': '사',
    '午': '오', '未': '미', '申': '신', '酉': '유', '戌': '술', '亥': '해'
};

const ELEMENT_KOREAN: Record<string, string> = {
    '木': '목', '火': '화', '土': '토', '金': '금', '水': '수'
};

const YUKCHEN_MAP: Record<string, { name: string; hanja: string }> = {
    '비견': { name: '비견', hanja: '比肩' },
    '겁재': { name: '겁재', hanja: '劫財' },
    '식신': { name: '식신', hanja: '食神' },
    '상관': { name: '상관', hanja: '傷官' },
    '편재': { name: '편재', hanja: '偏財' },
    '정재': { name: '정재', hanja: '正財' },
    '편관': { name: '편관', hanja: '偏官' },
    '정관': { name: '정관', hanja: '正官' },
    '편인': { name: '편인', hanja: '偏印' },
    '정인': { name: '정인', hanja: '正印' }
};

// ==================== 격국 분석 ====================

export function analyzeGekguk(saju: SajuData): GekgukAnalysis {
    const { dayGan, monthZhi, elementsDistribution } = saju;

    // 간단한 격국 판단 로직 (실제로는 더 복잡)
    // 월지의 지장간을 보고 일간과의 관계를 판단

    // 오행 강도 계산
    const totalElements = Object.values(elementsDistribution).reduce((a, b) => a + b, 0);
    const dayElement = getGanElement(dayGan);
    const dayElementCount = elementsDistribution[dayElement] || 0;
    const strength = dayElementCount >= 4 ? 4 : dayElementCount >= 3 ? 3 : dayElementCount >= 2 ? 2 : 1;

    const strengthLabels = ['', '약격', '약중격', '중격', '강격', '극강격'];

    // 기본 격국 판단 (샘플)
    let gekguk = '정관격';
    let hanja = '正官格';
    let description = '월지에 정관이 투출하여 정관격을 이룹니다. 정관격은 명예와 지위를 중시하며, 책임감이 강한 성향을 나타냅니다.';
    let characteristics = [
        '정관이 일간을 적절히 통제하여 균형 잡힌 기운을 형성',
        '명예와 직위를 중시하며 사회적 책임감이 강함',
        '안정적인 직업과 규칙적인 생활을 선호하는 경향'
    ];

    // 오행 분포에 따른 격국 힌트
    const dominantElement = Object.entries(elementsDistribution)
        .reduce((a, b) => a[1] > b[1] ? a : b)[0];

    if (dominantElement === '金' && dayElement !== '金') {
        gekguk = '정재격';
        hanja = '正財格';
        description = '金 기운이 강하여 재성이 왕성한 정재격입니다. 재물 관리에 능하고 현실적이며 실리를 추구합니다.';
        characteristics = [
            '재물운이 좋고 경제 관념이 뛰어남',
            '현실적이고 실용적인 판단력 보유',
            '안정적인 재산 축적에 유리한 사주'
        ];
    } else if (dominantElement === '水' && dayElement !== '水') {
        gekguk = '정인격';
        hanja = '正印格';
        description = '水 기운이 강하여 인성이 왕성한 정인격입니다. 학문과 지혜를 중시하며 정신적 가치를 추구합니다.';
        characteristics = [
            '학습 능력이 뛰어나고 지혜로움',
            '어른이나 스승의 도움을 받기 쉬움',
            '정신적, 학문적 분야에서 성공하기 유리'
        ];
    }

    return {
        gekguk,
        hanja,
        strength,
        strengthLabel: strengthLabels[strength] || '중격',
        description,
        characteristics
    };
}

// ==================== 신살 계산 ====================

export function calculateSinsal(saju: SajuData): SinsalItem[] {
    const { yearZhi, dayZhi, pillars } = saju;
    const sinsalList: SinsalItem[] = [];

    // 역마살 (驛馬殺) - 申子辰 -> 寅, 寅午戌 -> 申, 巳酉丑 -> 亥, 亥卯未 -> 巳
    const yeokmaMap: Record<string, string> = {
        '申': '寅', '子': '寅', '辰': '寅',
        '寅': '申', '午': '申', '戌': '申',
        '巳': '亥', '酉': '亥', '丑': '亥',
        '亥': '巳', '卯': '巳', '未': '巳'
    };

    const yeokma = yeokmaMap[yearZhi];
    const pillarZhis = [dayZhi, pillars?.month?.zhi, pillars?.year?.zhi, pillars?.day?.zhi].filter(Boolean);
    if (pillarZhis.includes(yeokma)) {
        sinsalList.push({
            name: '역마살',
            hanja: '驛馬殺',
            type: 'neutral',
            category: '이동·변화',
            description: '이동과 변화를 좋아하는 성향으로, 한 곳에 머무르기보다는 여러 곳을 다니며 활동하는 것을 선호합니다.',
            influence: '해외 활동이나 출장이 많을 수 있으며, 직업이나 거주지가 자주 바뀔 수 있습니다. 여행업, 무역, 운송업 등에 적합합니다.'
        });
    }

    // 천을귀인 (天乙貴人) - 갑일간: 축·미, 을일간: 자·신 등
    const cheoneulMap: Record<string, string[]> = {
        '甲': ['丑', '未'], '戊': ['丑', '未'],
        '乙': ['子', '申'], '己': ['子', '申'],
        '丙': ['亥', '酉'], '丁': ['亥', '酉'],
        '庚': ['丑', '未'], '辛': ['寅', '午'],
        '壬': ['卯', '巳'], '癸': ['巳', '卯']
    };

    const cheonul = cheoneulMap[saju.dayGan] || [];
    const cheoneulPillarZhis = [dayZhi, pillars?.month?.zhi, pillars?.year?.zhi, pillars?.day?.zhi].filter(Boolean);
    if (cheonul.some((z: string) => cheoneulPillarZhis.includes(z))) {
        sinsalList.push({
            name: '천을귀인',
            hanja: '天乙貴人',
            type: 'good',
            category: '귀인·도움',
            description: '어려움에 처했을 때 도움을 주는 귀인이 나타나는 길신입니다.',
            influence: '위기 상황에서 예상치 못한 도움을 받을 수 있으며, 인복이 좋습니다. 윗사람이나 권력자의 도움을 받기 쉽습니다.'
        });
    }

    // 화개살 (華蓋殺) - 寅午戌 -> 戌, 申子辰 -> 辰, 巳酉丑 -> 丑, 亥卯未 -> 未
    const hwagaeMap: Record<string, string> = {
        '寅': '戌', '午': '戌', '戌': '戌',
        '申': '辰', '子': '辰', '辰': '辰',
        '巳': '丑', '酉': '丑', '丑': '丑',
        '亥': '未', '卯': '未', '未': '未'
    };

    const hwagae = hwagaeMap[yearZhi];
    const hwagaePillarZhis = [dayZhi, pillars?.month?.zhi, pillars?.year?.zhi, pillars?.day?.zhi].filter(Boolean);
    if (hwagaePillarZhis.includes(hwagae)) {
        sinsalList.push({
            name: '화개살',
            hanja: '華蓋殺',
            type: 'neutral',
            category: '예술·학문',
            description: '예술적 감각과 영적인 재능이 뛰어나며, 종교나 철학에 관심이 많습니다.',
            influence: '혼자만의 시간을 즐기며 창작 활동에 적합합니다. 예술, 종교, 학문, 철학 분야에서 재능을 발휘할 수 있습니다.'
        });
    }

    // 도화살 (桃花殺) - 申子辰 -> 酉, 寅午戌 -> 卯, 巳酉丑 -> 午, 亥卯未 -> 子
    const dohwaMap: Record<string, string> = {
        '申': '酉', '子': '酉', '辰': '酉',
        '寅': '卯', '午': '卯', '戌': '卯',
        '巳': '午', '酉': '午', '丑': '午',
        '亥': '子', '卯': '子', '未': '子'
    };

    const dohwa = dohwaMap[yearZhi];
    const dohwaPillarZhis = [dayZhi, pillars?.month?.zhi].filter(Boolean);
    if (dohwaPillarZhis.includes(dohwa)) {
        sinsalList.push({
            name: '도화살',
            hanja: '桃花殺',
            type: 'neutral',
            category: '인기·매력',
            description: '외모가 준수하고 이성에게 인기가 많으며, 사교성이 뛰어납니다.',
            influence: '대인관계가 원활하고 사람들의 주목을 받기 쉽습니다. 연예, 서비스, 영업 분야에 유리하나, 이성 관계에 주의가 필요합니다.'
        });
    }

    return sinsalList;
}

// ==================== 용신 분석 ====================

export function analyzeYongsin(saju: SajuData): YongsinAnalysis {
    const { elementsDistribution } = saju;
    const dayElement = getGanElement(saju.dayGan);

    // 오행 분포 분석
    const elementCounts = { ...elementsDistribution };
    const total = Object.values(elementCounts).reduce((a, b) => a + b, 0);

    // 가장 약한 오행 찾기
    const sortedElements = Object.entries(elementCounts)
        .sort((a, b) => a[1] - b[1]);

    const weakest = sortedElements[0][0];
    const strongest = sortedElements[sortedElements.length - 1][0];

    // 용신: 부족한 오행 또는 일간을 돕는 오행
    let yongsin = weakest;
    let yongsinReason = `사주에서 ${ELEMENT_KOREAN[weakest]} 기운이 가장 약하여 ${ELEMENT_KOREAN[weakest]}을 용신으로 삼습니다.`;

    // 일간이 약하면 일간을 생하는 오행을 용신으로
    const dayElementCount = elementCounts[dayElement] || 0;
    if (dayElementCount <= 2) {
        const shengElement = getShengElement(dayElement);
        yongsin = shengElement;
        yongsinReason = `일간 ${dayElement}(${ELEMENT_KOREAN[dayElement]}) 기운이 약하여, 이를 생하는 ${ELEMENT_KOREAN[shengElement]}을 용신으로 삼습니다.`;
    }

    // 희신: 용신을 생하는 오행
    const huisin = getShengElement(yongsin);

    // 기신: 용신을 극하는 오행
    const gisin = getKeElement(yongsin);

    const recommendation = `${ELEMENT_KOREAN[yongsin]} 기운이 강한 환경과 직업을 선택하면 운세가 상승합니다. ${ELEMENT_KOREAN[huisin]}과 함께 활용하면 효과가 극대화되며, ${ELEMENT_KOREAN[gisin]}은 가급적 피하는 것이 좋습니다.`;

    return {
        yongsin,
        yongsinKorean: ELEMENT_KOREAN[yongsin],
        huisin,
        huisinKorean: ELEMENT_KOREAN[huisin],
        gisin,
        gisinKorean: ELEMENT_KOREAN[gisin],
        yongsinReason,
        recommendation
    };
}

// ==================== 육친 분석 ====================

export function analyzeYukchin(saju: SajuData): YukchinAnalysis {
    const { dayGan, pillars } = saju;
    const dayElement = getGanElement(dayGan);

    const yukchinCounts: Record<string, { count: number; pillars: string[]; elements: string[] }> = {
        '비견': { count: 0, pillars: [], elements: [] },
        '겁재': { count: 0, pillars: [], elements: [] },
        '식신': { count: 0, pillars: [], elements: [] },
        '상관': { count: 0, pillars: [], elements: [] },
        '편재': { count: 0, pillars: [], elements: [] },
        '정재': { count: 0, pillars: [], elements: [] },
        '편관': { count: 0, pillars: [], elements: [] },
        '정관': { count: 0, pillars: [], elements: [] },
        '편인': { count: 0, pillars: [], elements: [] },
        '정인': { count: 0, pillars: [], elements: [] }
    };

    // 각 기둥의 천간/지지 확인
    const positions = [
        { name: '년간', gan: pillars.year?.gan },
        { name: '월간', gan: pillars.month?.gan },
        { name: '일지', gan: pillars.day?.zhi ? getZhiMainElement(pillars.day.zhi) : undefined },
        { name: '시간', gan: pillars.hour?.gan }
    ];

    positions.forEach(pos => {
        if (!pos.gan) return;
        const yukchen = getYukchen(dayGan, pos.gan);
        if (yukchen && yukchinCounts[yukchen]) {
            yukchinCounts[yukchen].count++;
            yukchinCounts[yukchen].pillars.push(pos.name);
            yukchinCounts[yukchen].elements.push(getGanElement(pos.gan));
        }
    });

    // 해석 추가
    const result: YukchinAnalysis = {};

    Object.entries(yukchinCounts).forEach(([name, data]) => {
        if (data.count > 0) {
            const strength = data.count >= 3 ? 'strong' : data.count >= 2 ? 'moderate' : 'weak';
            result[name] = {
                name,
                hanja: YUKCHEN_MAP[name]?.hanja || '',
                count: data.count,
                pillars: data.pillars,
                strength,
                interpretation: getYukchinInterpretation(name, strength)
            };
        }
    });

    return result;
}

// ==================== 대운 계산 ====================

export function calculateDaeun(birthDate: string, gender: string, saju: SajuData): DaeunPeriod[] {
    try {
        // 안전한 날짜 파싱
        const parsedDate = new Date(birthDate);
        if (isNaN(parsedDate.getTime())) {
            throw new Error('Invalid birth date');
        }

        const birthYear = parsedDate.getFullYear();
        const yearGan = saju.pillars.year.gan;
        const isYangYear = ['甲', '丙', '戊', '庚', '壬'].includes(yearGan);

        // 남자 양년생/여자 음년생: 순행, 남자 음년생/여자 양년생: 역행
        const isForward = (gender === 'male' && isYangYear) || (gender === 'female' && !isYangYear);

        const monthGan = saju.pillars.month.gan;
        const monthZhi = saju.pillars.month.zhi;

        const ganList = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
        const zhiList = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

        let currentGanIdx = ganList.indexOf(monthGan);
        let currentZhiIdx = zhiList.indexOf(monthZhi);

        const daeunList: DaeunPeriod[] = [];

        for (let i = 0; i < 8; i++) {
            const startYear = birthYear + (i * 10);
            const endYear = startYear + 9;
            const startAge = i * 10;
            const endAge = startAge + 9;

            if (isForward) {
                currentGanIdx = (currentGanIdx + 1) % 10;
                currentZhiIdx = (currentZhiIdx + 1) % 12;
            } else {
                currentGanIdx = (currentGanIdx - 1 + 10) % 10;
                currentZhiIdx = (currentZhiIdx - 1 + 12) % 12;
            }

            const gan = ganList[currentGanIdx];
            const zhi = zhiList[currentZhiIdx];
            const ganjiKorean = `${GANZHI_KOREAN[gan] || ''}${GANZHI_KOREAN[zhi] || ''}`;
            const element = getGanElement(gan);

            // 용신과의 관계로 운세 평가 (간단 버전)
            const fortune: 'good' | 'neutral' | 'bad' = 'neutral';
            const description = `${gan}${zhi}(${ganjiKorean}) 대운으로 ${ELEMENT_KOREAN[element] || ''} 기운이 강한 시기입니다.`;

            daeunList.push({
                startYear,
                endYear,
                age: `${startAge}-${endAge}세`,
                gan,
                zhi,
                ganjiKorean,
                element,
                fortune,
                description
            });
        }

        return daeunList;
    } catch (error) {
        console.error('Error in calculateDaeun:', error);
        return []; // 에러 발생 시 빈 배열 반환
    }
}

// ==================== 개운법 추천 ====================

export function getGaeunbubRecommendation(yongsin: string): GaeunbubRecommendation {
    const elementColors: Record<string, string[]> = {
        '木': ['초록', '청록', '녹색'],
        '火': ['빨강', '주황', '분홍'],
        '土': ['노랑', '갈색', '베이지'],
        '金': ['흰색', '은색', '금색'],
        '水': ['검정', '파랑', '남색']
    };

    const elementDirections: Record<string, string[]> = {
        '木': ['동쪽', '동남쪽'],
        '火': ['남쪽'],
        '土': ['중앙', '서남쪽', '동북쪽'],
        '金': ['서쪽', '서북쪽'],
        '水': ['북쪽']
    };

    const elementNumbers: Record<string, number[]> = {
        '木': [3, 8],
        '火': [2, 7],
        '土': [5, 10],
        '金': [4, 9],
        '水': [1, 6]
    };

    const elementJobs: Record<string, string[]> = {
        '木': ['교육', '출판', '환경', '농업', '임업', '의류'],
        '火': ['전기', '전자', 'IT', '에너지', '요식업', '연예'],
        '土': ['부동산', '건축', '토목', '농업', '도자기', '광업'],
        '金': ['금융', '기계', '자동차', '금속', '귀금속', '법률'],
        '水': ['수산', '운송', '무역', '관광', '음료', '통신']
    };

    const elementActivities: Record<string, string[]> = {
        '木': [
            '아침에 일어나서 동쪽을 바라보며 심호흡하기',
            '화분이나 나무를 키우며 자연과 교감하기',
            '초록색 소품이나 의류를 자주 활용하기',
            '산책이나 등산으로 자연 속에서 시간 보내기'
        ],
        '火': [
            '붉은색 액세서리나 의류 착용하기',
            '촛불이나 조명을 활용한 따뜻한 분위기 만들기',
            '남쪽 방향을 활용한 활동 및 업무',
            '열정적인 활동과 운동으로 에너지 높이기'
        ],
        '土': [
            '노란색이나 갈색 톤의 인테리어 활용',
            '도자기나 돌 소품 배치하기',
            '중앙 공간을 정리하고 안정감 있게 꾸미기',
            '규칙적인 식사와 안정적인 생활 패턴 유지'
        ],
        '金': [
            '흰색이나 금색 계열의 소품 활용',
            '서쪽 방향으로 책상이나 침대 배치',
            '금속 재질의 액세서리 착용',
            '깔끔하고 정돈된 환경 유지하기'
        ],
        '水': [
            '검은색이나 파란색 의류 착용',
            '북쪽 방향을 활용한 공간 배치',
            '물을 자주 마시고 수분 섭취 늘리기',
            '독서나 학습을 통한 지식 습득에 집중'
        ]
    };

    const keElement = getKeElement(yongsin);

    return {
        luckyElement: yongsin,
        colors: elementColors[yongsin] || [],
        directions: elementDirections[yongsin] || [],
        numbers: elementNumbers[yongsin] || [],
        jobs: elementJobs[yongsin] || [],
        activities: elementActivities[yongsin] || [],
        avoidElements: [keElement]
    };
}

// ==================== 헬퍼 함수 ====================

function getGanElement(gan: string): string {
    const ganElements: Record<string, string> = {
        '甲': '木', '乙': '木',
        '丙': '火', '丁': '火',
        '戊': '土', '己': '土',
        '庚': '金', '辛': '金',
        '壬': '水', '癸': '水'
    };
    return ganElements[gan] || '木';
}

function getZhiMainElement(zhi: string): string {
    const zhiElements: Record<string, string> = {
        '寅': '甲', '卯': '乙',
        '巳': '丙', '午': '丁',
        '辰': '戊', '戌': '戊', '丑': '己', '未': '己',
        '申': '庚', '酉': '辛',
        '亥': '壬', '子': '癸'
    };
    return zhiElements[zhi] || '甲';
}

function getShengElement(element: string): string {
    const shengMap: Record<string, string> = {
        '木': '水', '火': '木', '土': '火', '金': '土', '水': '金'
    };
    return shengMap[element] || '水';
}

function getKeElement(element: string): string {
    const keMap: Record<string, string> = {
        '木': '金', '火': '水', '土': '木', '金': '火', '水': '土'
    };
    return keMap[element] || '金';
}

function getYukchen(dayGan: string, targetGan: string): string | null {
    const dayElement = getGanElement(dayGan);
    const targetElement = getGanElement(targetGan);

    const dayYinYang = ['甲', '丙', '戊', '庚', '壬'].includes(dayGan) ? 'yang' : 'yin';
    const targetYinYang = ['甲', '丙', '戊', '庚', '壬'].includes(targetGan) ? 'yang' : 'yin';

    if (dayElement === targetElement) {
        return dayYinYang === targetYinYang ? '비견' : '겁재';
    }

    // 생 관계
    const shengElement = getShengTargetElement(dayElement);
    if (targetElement === shengElement) {
        return dayYinYang === targetYinYang ? '식신' : '상관';
    }

    // 극 관계 (일간이 극하는)
    const keElement = getKeTargetElement(dayElement);
    if (targetElement === keElement) {
        return dayYinYang === targetYinYang ? '편재' : '정재';
    }

    // 극 관계 (일간을 극하는)
    const keByElement = getKeElement(dayElement);
    if (targetElement === keByElement) {
        return dayYinYang === targetYinYang ? '편관' : '정관';
    }

    // 생 관계 (일간을 생하는)
    const shengByElement = getShengElement(dayElement);
    if (targetElement === shengByElement) {
        return dayYinYang === targetYinYang ? '편인' : '정인';
    }

    return null;
}

function getShengTargetElement(element: string): string {
    const shengMap: Record<string, string> = {
        '木': '火', '火': '土', '土': '金', '金': '水', '水': '木'
    };
    return shengMap[element] || '火';
}

function getKeTargetElement(element: string): string {
    const keMap: Record<string, string> = {
        '木': '土', '火': '金', '土': '水', '金': '木', '水': '火'
    };
    return keMap[element] || '土';
}

function getYukchinInterpretation(yukchen: string, strength: 'weak' | 'moderate' | 'strong'): string {
    const interpretations: Record<string, Record<string, string>> = {
        '비견': {
            weak: '형제나 동료의 수가 적어 독립적으로 일하는 것을 선호합니다.',
            moderate: '형제나 동료와 적절한 협력 관계를 유지하며, 팀워크가 원활합니다.',
            strong: '형제나 동료가 많아 협력적이나, 경쟁심이 강할 수 있습니다.'
        },
        '식신': {
            weak: '표현력이 다소 부족하나 내면의 생각이 깊습니다.',
            moderate: '창의성과 표현력이 적절하여 예술적 재능을 발휘할 수 있습니다.',
            strong: '표현력과 창의성이 뛰어나 예술, 창작 분야에서 성공할 가능성이 높습니다.'
        },
        '정재': {
            weak: '재물운이 약하나 정직하고 성실한 경제 활동을 합니다.',
            moderate: '재물 관리가 안정적이며 꾸준한 재산 축적이 가능합니다.',
            strong: '재물운이 왕성하여 경제적 성공 가능성이 높으나, 욕심에 주의가 필요합니다.'
        },
        '정관': {
            weak: '권위나 명예에 대한 욕구가 적어 자유로운 생활을 선호합니다.',
            moderate: '사회적 책임감이 적절하여 안정적인 직장 생활이 가능합니다.',
            strong: '명예와 지위를 중시하며 리더십이 뛰어나 관리직에 적합합니다.'
        },
        '정인': {
            weak: '학습 의욕이 다소 부족하나 실용적 지식을 선호합니다.',
            moderate: '학습 능력이 뛰어나고 어른의 도움을 받기 쉽습니다.',
            strong: '학문과 지혜를 중시하며 교육, 연구 분야에서 성공할 가능성이 높습니다.'
        }
    };

    return interpretations[yukchen]?.[strength] || '균형 잡힌 육친 구조를 보입니다.';
}
