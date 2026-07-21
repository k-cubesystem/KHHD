/**
 * 서비스 면책 고지 — 전 분석 결과 하단 공통 배치(R-P1-6).
 *
 * 한 줄·소형·비강조. cheonjiin·saju-result·today·wealth·new-year·compatibility 등
 * 모든 분석 결과 말미에 삽입하여 "참고용" 임을 일관되게 고지한다.
 */
export function ServiceDisclaimer({ className = '' }: { className?: string }) {
  return (
    <p
      className={`text-[11px] leading-relaxed text-ink-light/40 font-sans font-light text-center px-4 ${className}`.trim()}
    >
      본 풀이는 전통 명리학을 바탕으로 한 AI 해석으로, 참고용입니다. 중요한 결정은 신중히 내리세요.
    </p>
  )
}
