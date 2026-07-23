/**
 * AI 분석 원문 정돈 유틸 — 관상·손금·풍수 "상세 분석/전문 보기" 렌더용.
 *
 * AI 원문에는 파서용 `[[TAG: ...]]` 태그와 `[[SHOPPING_LIST]]…[[/SHOPPING_LIST]]`
 * 블록, 그리고 경량 마크다운(`**굵게**`, `## 소제목`, `- 리스트`)이 섞여 있다.
 * 이 순수 함수는 태그를 제거하고 마크다운을 안전한 HTML로 변환한다.
 *
 * XSS 안전: 입력의 기존 HTML은 먼저 이스케이프하고, 그 뒤 화이트리스트 태그
 * (<h4> <b> <ul> <li> <br>)만 생성한다. 따라서 입력에 `<script>`가 있어도
 * `&lt;script&gt;`로 무력화된다.
 *
 * 순수 함수(side-effect 없음) — 단위테스트 대상.
 */

/** &, <, > 이스케이프 (& 먼저). */
export function escapeHtml(input: string): string {
  return input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** 이스케이프된 텍스트에 인라인 서식(굵게)만 적용. */
function applyInline(escaped: string): string {
  // **굵게** → <b>굵게</b> (별표 내부에 별표/개행 없음)
  return escaped.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>')
}

/**
 * AI 원문에서 태그/블록을 제거하고 남은 순수 텍스트를 반환(HTML 변환 없음).
 * 태그만 노출되던 유령 문구를 없앨 때 사용.
 */
export function stripAnalysisTags(raw: string): string {
  if (!raw) return ''
  return raw
    .replace(/\[\[SHOPPING_LIST\]\][\s\S]*?\[\[\/SHOPPING_LIST\]\]/g, '')
    .replace(/\[\[[\s\S]*?\]\]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * AI 원문 → 안전한 HTML 문자열.
 * 1) `[[SHOPPING_LIST]]` 블록 제거 → 2) 나머지 `[[...]]` 태그 제거
 * 3) HTML 이스케이프 → 4) 경량 마크다운(소제목/굵게/리스트/줄바꿈) 변환.
 */
export function cleanAnalysisText(raw: string): string {
  if (!raw) return ''

  // 1) 태그·블록 제거 (이스케이프 이전 원문 기준)
  const stripped = raw
    .replace(/\[\[SHOPPING_LIST\]\][\s\S]*?\[\[\/SHOPPING_LIST\]\]/g, '')
    .replace(/\[\[[\s\S]*?\]\]/g, '')

  const lines = stripped.split(/\r?\n/)
  const out: string[] = []
  let inList = false
  let prevWasText = false

  const closeList = (): void => {
    if (inList) {
      out.push('</ul>')
      inList = false
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (line === '') {
      closeList()
      prevWasText = false
      continue
    }

    // 소제목: ## / ### … (모두 <h4>로 정규화 — 결과 카드 안 소제목 톤 통일)
    const heading = line.match(/^#{1,6}\s+(.*)$/)
    if (heading?.[1]) {
      closeList()
      out.push(`<h4>${applyInline(escapeHtml(heading[1].trim()))}</h4>`)
      prevWasText = false
      continue
    }

    // 리스트 항목: -, *, • 로 시작
    const listItem = line.match(/^[-*•]\s+(.*)$/)
    if (listItem?.[1]) {
      if (!inList) {
        out.push('<ul>')
        inList = true
      }
      out.push(`<li>${applyInline(escapeHtml(listItem[1].trim()))}</li>`)
      prevWasText = false
      continue
    }

    // 일반 텍스트: 연속 줄은 <br>로 이어붙임
    closeList()
    const segment = applyInline(escapeHtml(line))
    out.push(prevWasText ? `<br>${segment}` : segment)
    prevWasText = true
  }

  closeList()
  return out.join('\n').trim()
}
