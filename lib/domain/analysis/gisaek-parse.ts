/**
 * 관상 기색(氣色) 파서 — 전용 태그 우선, 없으면 휴리스틱 폴백(하위호환).
 *
 * 신 프롬프트는 `[[GISAEK: 현재 기색 한줄평, 관리 조언]]` 태그를 출력한다(A-2).
 * 구 프롬프트 응답에는 태그가 없으므로, 기색/안색/혈색/광택 키워드가 들어간
 * 원문 라인을 한 줄 뽑아 한줄평으로 쓴다(구프롬프트 후방호환).
 *
 * 순수 함수(side-effect 없음) — 단위테스트 대상.
 */

export interface GisaekResult {
  /** 현재 기색 한줄평 */
  reading: string
  /** 관리 조언(태그 둘째 값). 없으면 undefined. */
  advice?: string
}

const GISAEK_KEYWORD = /기색|안색|혈색|광택|윤기/

/**
 * 기색 파싱. 전용 태그(`[[GISAEK: 한줄평, 조언]]`) 우선, 실패 시 키워드 라인 휴리스틱.
 * 어느 쪽으로도 못 찾으면 undefined → UI는 기색 카드를 렌더하지 않는다.
 */
export function parseGisaek(text: string): GisaekResult | undefined {
  if (!text) return undefined

  // 1) 전용 태그: 첫 값=한줄평(콤마 없음), 둘째 값(선택)=조언
  const tag = text.match(/\[\[GISAEK:\s*([^,\]]+?)\s*(?:,\s*([\s\S]+?))?\]\]/)
  if (tag?.[1]) {
    const reading = tag[1].trim()
    const advice = tag[2]?.trim()
    if (reading) return advice ? { reading, advice } : { reading }
  }

  // 2) 휴리스틱 폴백: 기색 관련 키워드가 있는 원문 라인 한 줄.
  //    섹션 헤더([단계…]·##·**굵게**·리스트 마커)와 너무 짧은 라벨은 제외해
  //    "[4단계: 기색 분석]" 같은 제목이 아니라 실제 서술 문장을 고른다.
  const candidates = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && GISAEK_KEYWORD.test(l))
  const isHeaderish = (l: string): boolean => /^[[#*\-•]/.test(l) || /^\d+\s*단계/.test(l) || l.length < 10
  const line = candidates.find((l) => !isHeaderish(l)) ?? candidates[0]
  if (line) return { reading: line }

  return undefined
}
