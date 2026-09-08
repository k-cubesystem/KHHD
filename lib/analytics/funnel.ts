/**
 * 퍼널 정의 — 단일 출처. funnel_events.funnel_step 의 의미가 여기서 정해진다.
 * get_funnel_analysis RPC 는 step 순으로 사용자 수를 세고 이탈률을 낸다.
 *
 * 순서가 곧 의미다. 단계를 끼워 넣으면 과거 데이터의 step 번호가 어긋나므로 **끝에만 추가**하거나
 * 새 퍼널 이름을 쓴다.
 */
export const FUNNEL = {
  landing_view: 1, // 랜딩(로그인 전) 도달
  signup_start: 2, // 가입 화면 진입
  signup_done: 3, // 가입 완료
  first_analysis: 4, // 첫 분석 시작(사주·궁합 등)
  store_view: 5, // 상점 진입
  checkout_start: 6, // 결제 시작
  purchase: 7, // 결제 완료
} as const

export type FunnelStep = keyof typeof FUNNEL

/**
 * 속풀이(챗) 퍼널 — 메인 퍼널과 별개 이름 공간(P0-F4, 「새 퍼널 이름을 쓴다」 규칙).
 * 진입 → 첫 질문(활성화) → 한도 도달 → 질문권 충전. get_funnel_analysis 가 이름별로 센다.
 */
export const CHAT_FUNNEL = {
  chat_open: 1, // 속풀이 화면 진입
  chat_first_question: 2, // 세션 첫 질문(활성화)
  chat_limit_hit: 3, // 질문 한도 도달
  chat_ticket_purchase: 4, // 질문권 충전(1만냥→20회)
} as const

export type ChatFunnelStep = keyof typeof CHAT_FUNNEL

/**
 * 웹툰 퍼널 — 공개 뷰어의 «읽는다 → 반응한다 → 넘어온다» 여정. 별개 이름 공간.
 * 회차 번호는 metadata.no 로 싣는다(단계 수를 회차마다 늘리지 않는다).
 */
export const WEBTOON_FUNNEL = {
  webtoon_view: 1, // 회차 진입(본문 1장 이상 로드)
  webtoon_complete: 2, // 회차 완독(말미 도달)
  webtoon_jinmaek: 3, // 간이 진맥 제출(생년월일 입력)
  webtoon_cta_click: 4, // 서비스 CTA 클릭
} as const

export type WebtoonFunnelStep = keyof typeof WEBTOON_FUNNEL
