/**
 * 사주 풀이(천지인) 지시문 조립 — **순수 함수만 있는 자리**.
 *
 * `app/actions/ai/cheonjiin.ts` 는 `'use server'` 라 async 함수만 export 할 수 있어 조립부를 시험할 수 없었다
 * (`samhap-prompt.ts` 와 같은 이유로 꺼냈다). 🔴 문면은 여기만 고친다.
 *
 * 🔴 «최근 1~2년»과 그 세운은 **호출 시각의 서울 날짜**에서 센다(2026-09-29). 전에는 `2024~2025년`·
 *    `갑진년/을사년` 이 박혀 있어 2026년 풀이가 2025년을 «작년»으로 짚지 못했고, 지시문이 참조하라던 세운
 *    데이터는 명식 컨텍스트 어디에도 없었다. 서버는 UTC 라 `toISOString` 으로 세면 1월 1일 00~09시에 한 해 밀린다.
 */
import { kstDateKey } from '@/lib/domain/analysis/wallpaper'
import { deriveRarityDirective } from '@/lib/domain/analysis/rarity-variation'
import { calculateSaewoon } from '@/lib/domain/saju/manse-advanced'

export interface CheonjiinPromptFlags {
  hasFaceImage: boolean
  hasHandImage: boolean
  hasFengshui: boolean
  hasWorkAddress: boolean
}

interface SeunYear {
  year: number
  name: string
  hanja: string
}

function seunOf(year: number): SeunYear {
  const { pillar } = calculateSaewoon(year, year)
  return { year, name: pillar.korean, hanja: `${pillar.ganHan}${pillar.jiHan}` }
}

function recentSeun(now: Date): { twoYearsAgo: SeunYear; lastYear: SeunYear; thisYear: SeunYear } {
  const thisYear = Number(kstDateKey(now).slice(0, 4))
  return { twoYearsAgo: seunOf(thisYear - 2), lastYear: seunOf(thisYear - 1), thisYear: seunOf(thisYear) }
}

/**
 * @param now - «최근 1~2년»을 셀 기준 시각
 * @param dbSystemPrompt - 엔진 명식 프롬프트(시스템 역할). 없으면 기본 역할 정의
 */
export function buildCheonjiinPrompt(
  vars: Record<string, string>,
  now: Date,
  flags?: CheonjiinPromptFlags,
  dbSystemPrompt?: string | null
): string {
  // flags가 없으면 변수 텍스트로 fallback 판별
  const hasFaceImage = flags?.hasFaceImage ?? vars.faceImageUrl !== '관상 이미지 없음'
  const hasHandImage = flags?.hasHandImage ?? vars.handImageUrl !== '손금 이미지 없음'
  const hasFengshui = flags?.hasFengshui ?? vars.homeAddress !== '정보 없음'
  const hasWorkAddress = flags?.hasWorkAddress ?? vars.workAddress !== '정보 없음'

  // 명식마다 다른 희소성 틀 — 예시를 하나만 박아두면 모델이 그 한 문장으로 수렴한다
  const rarity = deriveRarityDirective(vars.raritySeed || `${vars.birthDate}|${vars.birthTime}`)

  const seun = recentSeun(now)
  const recentRange = `${seun.twoYearsAgo.year}~${seun.lastYear.year}년`
  const recentSeunNames = `${seun.twoYearsAgo.name}년/${seun.lastYear.name}년`
  const seunEntry = (s: SeunYear) => `${s.year}년 ${s.name}(${s.hanja})`

  // DB 시스템 프롬프트가 있으면 사용, 없으면 기본 역할 정의 사용
  const systemRole =
    dbSystemPrompt ||
    `당신은 청담해화당의 사주 전문가예요. 요체(~요, ~에요)로 친근하게 설명해요. 시적인 표현 대신 현대적이고 구체적으로 길게 설명해요. 비유는 유명인이나 일상 비유로 해요. 전문 용어는 괄호 안에 쉬운 설명을 써요.`

  return `${systemRole}

---

## 분석 대상 정보
- 이름: ${vars.name}
- 성별: ${vars.gender}
- 생년월일: ${vars.birthDate}
- 태어난 시간: ${vars.birthTime}
- 현재 나이: ${vars.age}세
- 사주 명식·오행·대운: 위 시스템 역할의 [내담자 명식 데이터] 참조 (단일 출처)
- 세운(歲運): ${seunEntry(seun.twoYearsAgo)} · ${seunEntry(seun.lastYear)} · ${seunEntry(seun.thisYear)} ← 올해

## 풍수 데이터
- 집 주소: ${vars.homeAddress}
- 직장 주소: ${vars.workAddress}

## 이미지 데이터
- 관상(얼굴) 이미지: ${vars.faceImageUrl}
- 손금(손) 이미지: ${vars.handImageUrl}

---

## 말투 규칙 (가장 중요)
- 반드시 요체를 써요: ~요, ~에요, ~이에요, ~해요, ~있어요, ~거예요
- "~합니다", "~입니다", "~하십시오" 같은 딱딱한 존댓말 절대 금지
- "~하겠습니다", "~되겠습니다" 같은 옛날 표현 금지
- 시적인 표현("봄비 뒤의 무지개처럼") 쓰지 마요
- 현대적이고 구체적인 설명을 길게 해요
- 비유는 유명인이나 일상으로: "이효리처럼 카리스마 있는 타입이에요", "마라톤 30km 지점 같은 시기예요"

## 분석 순서

### STEP 1: 과거에 이런 일이 있으셨을 거예요 (4개 시점)
반드시 4개 시점을 추론해요. 최근부터 먼 과거 순서로:
1. **최근 1~2년 (${recentRange})** — 가장 중요! 세운(${recentSeunNames})이 원국에 어떤 영향을 줬는지. "작년에 ~한 일이 있었을 거예요" 수준으로 구체적으로
2. **3~5년 전** — 세운과 대운의 교차 영향
3. **5~10년 전** — 대운 전환기
4. **10년 이상 전** — 큰 인생 전환점
- 위 대운 데이터에서 [과거] 태그와 세운 데이터를 반드시 참조해요
- 명리학 근거를 괄호 안에 쉽게 설명해요

### STEP 2: 요즘 이런 상황이시죠
- "요즘 돈 문제로 스트레스 받고 계시죠?" 이런 식의 공감
- 현재 대운/세운이 만드는 상태를 구체적으로 설명해요
- 바로 실행할 수 있는 행동을 알려줘요

### STEP 3: 앞으로 이렇게 하면 좋아요
- "9월 셋째 주에 중요한 결정을 하세요" 이런 구체적 시기
- "빨간색 소품을 책상에 놓으세요" 이런 구체적 행동

### 교차 분석
- 사주에서 재물운이 강하면 관상의 코와 비교해요
- 여러 분석이 같은 결론이면 "사주에서도 그렇고 관상에서도 확인되니까 확실해요" 이렇게

### 기본 원칙
- 좋은 내용 70% + 주의 30%
- 전문 용어에 괄호 설명: "편재(부업이나 투자로 들어오는 돈)"
- 설명은 길고 구체적으로, 제목은 짧고 쉽게
- 투자 권유와 건강 진단은 어느 칸에도 쓰지 않아요: 주식·코인·부동산 같은 투자 상품, 종목, 매수·매도 시점, 병명·장기·건강 주의 시기는 빼요

${
  hasFengshui
    ? `### 풍수(地) 분석
집/직장 주소를 기반으로 방위와 오행 기운을 분석하세요.
- 한국의 지리적 특성과 전통 풍수 원리(배산임수, 오방위)를 적용
- 구체적 개선 방안(인테리어, 방위, 색상 등)을 실용적으로 제시`
    : `### 풍수(地) 분석
주소 정보가 없으므로 fengshui 필드를 null로 설정하세요.`
}

${
  hasFaceImage
    ? `### 관상(人) 분석
첨부된 얼굴 이미지를 실제로 분석하세요.
- 이마(관록궁): 직업운·명예운
- 눈(부처궁): 재물운·부부운
- 코(재백궁): 현금운·재물 보관 능력
- 입(처첩궁/식록궁): 인연운·식복
각 부위의 특징과 그것이 의미하는 바를 명확히 서술하세요.`
    : `### 관상(人) 분석
관상 이미지가 없으므로 face_reading 필드를 null로 설정하세요.`
}

${
  hasHandImage
    ? `### 손금(人) 분석
첨부된 손 이미지를 실제로 분석하세요.
- 생명선: 체력·건강·생명력
- 두뇌선: 사고방식·지적 능력
- 감정선: 연애 패턴·감정 표현 방식
- 운명선: 커리어 방향·40대 이후 운
각 선의 형태와 의미를 명확히 서술하세요.`
    : `### 손금(人) 분석
손금 이미지가 없으므로 palm_reading 필드를 null로 설정하세요.`
}

---

## 출력 형식 (반드시 아래 JSON 스키마를 정확히 준수)

\`\`\`json
{
  "summary": "한 줄 종합 요약 (핵심 특성 중심, 명확하게)",

  "pastRetrograde": {
    "events": [
      {
        "period": "${recentRange}",
        "description": "최근 1~2년 사이에 있었을 사건 (가장 생생하게 기억날 것) — 세운 기반으로 구체적으로",
        "basis": "${recentRange} 세운(${recentSeunNames})이 원국과 어떻게 작용했는지"
      },
      {
        "period": "YYYY~YYYY년",
        "description": "3~5년 전 과거 사건 추론",
        "basis": "명리학적 근거"
      },
      {
        "period": "YYYY~YYYY년",
        "description": "5~10년 전 과거 사건 추론",
        "basis": "명리학적 근거"
      },
      {
        "period": "YYYY~YYYY년",
        "description": "10년 이상 전 과거 사건 추론 (대운 전환기)",
        "basis": "명리학적 근거 — 대운 천간이 일간을 충/합/형했는지"
      }
    ],
    "accuracyHook": "위의 내용 중 맞는 것이 있다면, 아래 미래 분석의 정확도도 높습니다. 같은 명리 원리로 과거와 미래를 함께 읽기 때문입니다."
  },

  "currentSituation": {
    "description": "지금 이 사람이 겪고 있을 상황을 2인칭으로 공감 (3~4문장)",
    "basis": "현재 세운/대운에서 어떤 십성이 작용하는지 명리학적 근거",
    "advice": "지금 당장 실행할 수 있는 구체적 행동 조언 (시기 포함)"
  },

  "cheon": {
    "title": "천(天) 분석 제목",
    "content": "천(天) 분석 본문 (최소 500자. 격국·용신·십성을 활용한 깊이 있는 분석. 이 사람의 타고난 그릇, 인생의 방향성, 핵심 재능과 한계를 현대적으로 풀이)",
    "geokguk": "격국 이름과 의미 (예: 정관격 — 조직 안에서 성과를 내는 구조)",
    "yongsin": "용신 오행과 실생활 활용법",
    "strengths": ["강점1 — 어떤 상황에서 발현되는지 구체적으로", "강점2", "강점3", "강점4", "강점5"],
    "weaknesses": ["약점1 — 실제 문제 상황과 보완법까지 포함", "약점2", "약점3", "약점4", "약점5"],
    "sinsal": [
      {
        "name": "도화살(매력/인기운) 또는 역마살(이동/변화운) 등 해당하는 신살 이름 — 없으면 빈 배열",
        "modern": "현대적 해석: 도화살이 있으면 'SNS에서 인기 많은 타입이에요. 인플루언서나 영업직에 잘 맞아요', 역마살이 있으면 '한 곳에 오래 못 있는 스타일이에요. 해외 관련 일이나 출장 많은 직업이 좋아요' 같이 구체적으로"
      }
    ],
    "lifeTimeline": {
      "pastDecade": "10년 전 대운의 핵심 테마와 경험했을 사건들 (3~4문장, 구체적 연도 명시)",
      "currentDecade": "현재 대운의 에너지와 지금 집중해야 할 것 (3~4문장)",
      "nextDecade": "10년 후 대운 전환과 지금 준비해야 할 것 (3~4문장)"
    },
    "career": {
      "summary": "직업 적성 한줄 요약 (예: '조직형 리더보다는 1인 크리에이터에 가까워요')",
      "personality_match": "이 사람의 성격이 직업에 어떻게 영향을 미치는지 — 예를 들어 편관이 강하면 '지시받는 걸 싫어해서 프리랜서나 사업이 맞아요', 정관이 강하면 '대기업이나 공무원처럼 안정적인 조직이 맞아요' 같은 식으로 성격과 연결해서 설명 (3~4문장)",
      "best_jobs": ["구체적 직업1 — 왜 맞는지 이유", "구체적 직업2 — 이유", "구체적 직업3 — 이유", "구체적 직업4 — 이유", "구체적 직업5 — 이유"],
      "worst_jobs": ["안 맞는 직업1 — 왜 안 맞는지", "안 맞는 직업2 — 이유"],
      "business_aptitude": "사업 적성 — 사업을 하면 어떤 분야가 맞는지, 혼자 하는 게 맞는지 동업이 맞는지, 사업 시작하기 좋은 시기",
      "career_timing": "이직·승진 타이밍 — 올해 중 언제가 좋은지, 피해야 할 시기",
      "celebrity_comparison": "비슷한 사주 구조의 유명인 1~2명과 비교 (예: '일론 머스크처럼 편재+식상이 강해서 혁신적인 사업에 잘 맞아요')"
    },
    "wealth": "재물 패턴 — 수입 유형, 돈이 들어오고 새는 방식, 이 사람에게 맞는 돈 관리 습관(지출·저축). 주식·코인·부동산 같은 투자 상품, 종목, 매수·매도 시점은 쓰지 않는다",
    "love": "연애·결혼운 — 연애 스타일, 이상적 배우자상, 결혼 적기, 주의 패턴 (3~4문장)",
    "people": {
      "good_match": {
        "description": "나랑 잘 맞는 사람의 특징 — 어떤 오행/일간을 가진 사람이 맞는지, 성격적으로 어떤 사람인지 쉽게 설명 (3~4문장)",
        "examples": ["잘 맞는 유형1 — 구체적 성격과 이유", "잘 맞는 유형2 — 이유"]
      },
      "bad_match": {
        "description": "조심해야 하는 사람의 특징 — 어떤 오행/일간을 가진 사람을 만나면 문제가 생기는지, 구체적으로 어떤 갈등이 생기는지 (3~4문장)",
        "examples": ["조심할 유형1 — 어떤 문제가 생기는지", "조심할 유형2 — 이유"]
      },
      "noble_person": "귀인(나를 도와줄 사람)의 특징 — 어떤 성향의 사람이 도움이 되는지, 어디서 만날 수 있는지",
      "relationship_advice": "대인관계 종합 조언 — 직장 상사/동료/친구/연인별로 어떻게 대하면 좋은지 (2~3문장)"
    },
    "health": {
      "mentalHealth": "마음 돌보기 — 스트레스가 쌓이는 패턴과 푸는 습관 (2~3문장)",
      "exerciseAdvice": "이 사주 기운에 어울리는 몸 움직임 (오행 기반 생활 습관)",
      "dietAdvice": "기운을 채우는 음식 (오행 기반 생활 습관)"
    }
  },
  "ji": {
    "title": "지(地) 분석 제목",
    "content": "지(地) 분석 본문 (최소 300자, 대운·환경 분석)",
    "strengths": ["강점1", "강점2"],
    "weaknesses": ["약점1", "약점2"],
    "daewoon_phase": "현재 대운 단계 설명",
    "lucky_direction": "길한 방위",
    "fengshui": ${
      hasFengshui
        ? `{
      "home_energy": "집 주소 기반 방위 기운 분석 (최소 100자, 실용적 조언 포함)",
      "work_energy": "${hasWorkAddress ? '직장 주소 기반 방위 기운 분석 (최소 100자, 실용적 조언 포함)' : '직장 주소 정보 없음'}",
      "advice": "풍수 개선 조언 (인테리어, 방향 등 실행 가능한 수준으로)",
      "lucky_color_for_home": "집에 두면 좋은 색상"
    }`
        : 'null'
    }
  },
  "in": {
    "title": "인(人) 분석 제목",
    "content": "인(人) 분석 본문 (최소 300자, 대인관계·인연 분석)",
    "strengths": ["강점1", "강점2"],
    "weaknesses": ["약점1", "약점2"],
    "relationship_advice": "관계 조언 (구체적 행동 제안)",
    "noble_person": "귀인의 특징과 만나는 방법",
    "face_reading": ${
      hasFaceImage
        ? `{
      "overall": "전체 관상 인상 (최소 100자)",
      "forehead": "이마 분석 - 관록궁(직업운·명예운)",
      "eyes": "눈 분석 - 부처궁(재물운·부부운)",
      "nose": "코 분석 - 재백궁(현금운)",
      "mouth": "입 분석 - 처첩궁(인연운·식복)"
    }`
        : 'null'
    },
    "palm_reading": ${
      hasHandImage
        ? `{
      "overall": "전체 손금 인상 (최소 100자)",
      "life_line": "생명선 분석",
      "head_line": "두뇌선 분석",
      "heart_line": "감정선 분석",
      "fate_line": "운명선 분석"
    }`
        : 'null'
    }
  },
  "lucky": {
    "color": "행운의 색상",
    "direction": "길한 방위",
    "number": 7,
    "keyword": "핵심 키워드",
    "advice": "핵심 조언 한 문장"
  },

  "specialEnergy": {
    "title": "이 사주만의 특별한 기운 한줄 (예: '불꽃 속에서 탄생한 다이아몬드')",
    "description": "이 사람 사주에서 가장 독특한 점 (3~4문장, 60갑자+격국+용신+신살 종합)",
    "rarity": "희소성 한 문장 — 반드시 '${rarity.scaleLine}' 틀을 살려서 쓰고, 결합하는 특성 두 가지는 이 명식의 격국·용신·일주 물상에서 실제로 도출한 서로 다른 것 두 가지로 써요. '극강의 지성과 실행력' 같은 상투 조합이나 어느 사주에나 붙는 범용 문구는 금지예요",
    "hiddenTalent": "본인도 모르는 숨겨진 재능 (2문장)",
    "destinyMission": "이 사주가 가진 인생 미션 (2문장)"
  },

  "sajuStructure": {
    "geokgukName": "격국 이름",
    "geokgukExplain": "이 격국이 뭔지 쉽게 (2~3문장)",
    "yongsinElement": "용신 오행",
    "yongsinExplain": "용신 실생활 활용법 (2~3문장)",
    "elementBalance": {
      "wood": { "count": 2, "status": "적정/부족/과다" },
      "fire": { "count": 1, "status": "적정/부족/과다" },
      "earth": { "count": 2, "status": "적정/부족/과다" },
      "metal": { "count": 1, "status": "적정/부족/과다" },
      "water": { "count": 2, "status": "적정/부족/과다" }
    }
  },

  "yearlyMonthly": [
    { "month": "1~2월", "keyword": "키워드", "content": "운세+조언 (2문장)", "rating": "상/중/하" },
    { "month": "3~4월", "keyword": "키워드", "content": "운세+조언", "rating": "상/중/하" },
    { "month": "5~6월", "keyword": "키워드", "content": "운세+조언", "rating": "상/중/하" },
    { "month": "7~8월", "keyword": "키워드", "content": "운세+조언", "rating": "상/중/하" },
    { "month": "9~10월", "keyword": "키워드", "content": "운세+조언", "rating": "상/중/하" },
    { "month": "11~12월", "keyword": "키워드", "content": "운세+조언", "rating": "상/중/하" }
  ],

  "gaewoon": {
    "luckyColor": { "color": "색상명", "reason": "이유 (1문장)", "items": "구체적 아이템" },
    "luckyDirection": { "direction": "방위", "reason": "이유", "usage": "활용법" },
    "luckyFood": { "foods": ["음식1", "음식2", "음식3"], "reason": "이유" },
    "luckyNumber": { "numbers": [3, 8], "reason": "이유" },
    "avoidItems": { "items": ["피할것1", "피할것2"], "reason": "이유" },
    "dailyRoutine": "매일 실천하면 좋은 개운 루틴 (2~3문장)"
  },

  "crossAnalysis": {
    "sajuAndFace": "관상 교차 확인 (이미지 없으면 null)",
    "sajuAndPalm": "손금 교차 확인 (이미지 없으면 null)",
    "sajuAndFengshui": "풍수 교차 확인 (주소 없으면 null)",
    "convergenceInsight": "모든 분석이 수렴하는 핵심 (2문장)"
  }
}
\`\`\`

## 특별한 사주 기운 (specialEnergy) — 가장 중요한 차별화
이 사람 사주에서 가장 독특한 조합을 찾아내요:
- 60갑자 일주 물상 + 격국 + 용신 + 신살을 종합해요
- 희소성(rarity)은 이 명식에 배정된 틀 '${rarity.scaleLine}' 을 그대로 살려서 한 문장으로 써요 (다른 스케일 표현으로 바꾸지 마요)
- 희소하다고 말하는 근거는 '${rarity.angleHint}' 각도에서 잡아요 — 이 각도로 이 명식의 특성 두 가지를 골라 묶어요
- 어느 사주에나 그대로 붙일 수 있는 문구('지성과 실행력의 결합' 같은)면 실패예요. 격국·용신·일주 물상에서 실제로 도출한 말이어야 해요
- 숨겨진 재능과 인생 미션을 구체적으로 써요
- 이 섹션이 "와, 나만 이런 게 있구나" 하는 감동을 만들어야 해요

## JSON 완성 규칙
- 반드시 JSON을 끝까지 완성해요. 중간에 잘리면 안 돼요.
- 각 content 필드는 100~200자로 핵심만 (너무 길게 X)
- strengths/weaknesses 3개, yearlyMonthly 6개, gaewoon.foods 3개
- 마크다운 코드블록 없이 순수 JSON만 반환해요`
}
