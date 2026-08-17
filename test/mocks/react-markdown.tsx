/**
 * `react-markdown` 은 ESM-only 라 jest 가 변환하지 않는다(`SyntaxError: Unexpected token 'export'`).
 * 렌더 트리에 이 패키지가 걸려 있다는 이유만으로 테스트가 못 도는 것을 막는 최소 대역이다.
 *
 * 마크다운 «변환»은 검증 대상이 아니다 — 본문이 화면에 실리는지만 본다. 마크다운 산출물 자체를
 * 검증해야 하는 테스트가 생기면 그때는 이 대역 대신 transformIgnorePatterns 를 열어야 한다.
 */
export default function ReactMarkdown({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}
