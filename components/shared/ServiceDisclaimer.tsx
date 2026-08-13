/**
 * AI 결과물 고지 — 「AI기본법」 §31② 표시 의무 + 오락·참고 고지를 한 컴포넌트에서 함께 진다.
 *
 * 법 제31조제2항: 「인공지능사업자는 생성형 인공지능 … 을 제공하는 경우 그 결과물이 생성형
 * 인공지능에 의하여 생성되었다는 사실을 표시하여야 한다.」 시행령 §23②1호의 「사람이 인식할 수
 * 있는 방법」으로 이행한다. 조사 정본: docs/REPORTS/RESEARCH-20260812-ai-basic-act.md
 *
 * 🔴 문안에서 「생성형 인공지능」 을 빼면 법정 문언이 무너진다 — 회귀 테스트가 막는다
 *    (components/shared/__tests__/service-disclaimer.test.tsx).
 * 🔴 캡처·공유로 **외부 반출**되는 화면에서는 이 고지가 캡처 컨테이너 «안» 에 있어야 한다.
 *    가이드라인이 「외부 반출 시 결과물 자체에 표시」로 구분한 지점이라, 화면 밖에 두면
 *    이미지에 따라가지 않는다. share-save-buttons 가 data-ai-disclosure 로 그 존부를 확인한다.
 */

/** 법이 요구하는 핵심 문언. 문구를 고쳐도 이 말은 남아야 한다. */
export const AI_DISCLOSURE_TERM = '생성형 인공지능'

/** 캡처 시 고지 존부를 판정하는 표식(share-save-buttons 와의 계약). */
export const AI_DISCLOSURE_ATTR = 'data-ai-disclosure'

/**
 * 한 줄이 통째로 들어갈 자리가 없는 반출물용 짧은 표시 — 웹푸시 본문 꼬리표, 생성 그림에 태우는
 * 캡션 등. 자리가 좁아도 「생성형 인공지능」 은 줄이지 않는다.
 */
export const AI_DISCLOSURE_MARK = '생성형 인공지능이 생성'

/** 화면 성격별 문안. 세계관 어휘를 지키되 법정 문언은 전부 담는다. */
export type DisclaimerTone = 'reading' | 'photo' | 'chat' | 'oracle' | 'share' | 'image' | 'webtoon'

export const AI_DISCLOSURE_TEXT: Record<DisclaimerTone, string> = {
  /**
   * 사주·궁합·운세 등 글 풀이 일반.
   * 「참고용입니다」 는 종전 문안에서 이어받은 말이다 — 테마 목록 화면의 고지 회귀 테스트가
   * 이 말을 붙들고 있으므로(app/protected/analysis/theme/__tests__) 함부로 바꾸지 말 것.
   */
  reading:
    '이 풀이는 전통 명리학을 바탕으로 생성형 인공지능이 생성한 글이며, 참고용입니다. 중한 일은 스스로 헤아려 정하십시오.',
  /** 관상·손금·풍수 — 올린 사진을 입력으로 쓰므로 한 겹 더 */
  photo:
    '이 풀이는 올려주신 사진을 생성형 인공지능이 살펴 생성한 글입니다. 참고를 위한 것이며, 의료·법률·재무의 판단을 대신하지 않습니다.',
  /** 고민상담 — 신위를 지우지 않고 층을 나눈다 */
  chat: '해화당의 신위는 생성형 인공지능이 대신 목소리를 냅니다. 오가는 말은 참고로 삼으십시오.',
  /** 신탁 오버레이 — 자리가 한 줄뿐이다 */
  oracle: '이 신탁은 생성형 인공지능이 생성한 말입니다.',
  /** /share/* 공개 페이지 — 비로그인 외부 공개라 작게 숨기지 않는다 */
  share: '이 풀이는 청담 해화당에서 생성형 인공지능이 생성한 글입니다. 참고를 위한 것입니다.',
  /** 부적·운세카드 등 생성 이미지의 화면 캡션 */
  image: '이 그림은 생성형 인공지능이 생성한 것입니다.',
  /** 웹툰 회차 — 컷 그림이 생성물이다(화면 단위 1회) */
  webtoon: '이 회차의 그림은 생성형 인공지능이 생성한 것입니다.',
}

/**
 * 크기 — DESIGN.md caption(12px). 종전 11px·불투명도 40% 에서 한 단계 올렸다:
 * 「표시」로 인정받으려면 읽혀야 한다(조사 보고서 R1).
 */
const CAPTION_CLASS = 'text-xs text-ink-light/60'

/** 외부 공개 지면(비로그인)은 본문 크기 — 작게 숨기면 「표시」로 보기 어렵다. */
const PUBLIC_CLASS = 'text-sm text-ink-light/70'

export function ServiceDisclaimer({ tone = 'reading', className = '' }: { tone?: DisclaimerTone; className?: string }) {
  return (
    <p
      {...{ [AI_DISCLOSURE_ATTR]: tone }}
      className={`${tone === 'share' ? PUBLIC_CLASS : CAPTION_CLASS} leading-relaxed font-sans font-light text-center px-4 ${className}`.trim()}
    >
      {AI_DISCLOSURE_TEXT[tone]}
    </p>
  )
}
