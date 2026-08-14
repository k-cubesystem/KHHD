/**
 * 서술 품질 레이어의 계약.
 *
 * 이 파일이 지키는 것은 둘이다 —
 *   ① **돈을 받은 자리에만 붙는다.** 무료 경로에 새면 매출 0인 곳의 토큰만 늘어난다.
 *   ② **규율 문면이 함부로 물러지지 않는다.** 「이렇게 쓰지 마라」를 지우는 것은 한 줄이지만
 *      그 순간 결과 문장이 다시 «누구에게나 해당되는 문장»으로 수렴한다.
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  findProseSmells,
  PLAIN_TERMS,
  PREMIUM_PROSE_LAYER,
  PROSE_CLICHES,
  PROSE_MACHINE_TICS,
  TERM_DISCIPLINE,
  withProseTier,
} from '@/lib/ai/prose-quality'

const GUIDE = '[분석 지침]\n원래 있던 지침'

describe('등급 — 문장 공예는 유료에만, 용어 예산은 모두에게', () => {
  it('standard 도 용어 예산은 받는다 (무료가 어려우면 유료로 넘어올 이유가 없다)', () => {
    const result = withProseTier(GUIDE, 'standard')

    expect(result.startsWith(GUIDE)).toBe(true)
    expect(result).toContain(TERM_DISCIPLINE)
    expect(result).not.toContain(PREMIUM_PROSE_LAYER)
  })

  it('premium 은 원래 지침을 남기고 뒤에 규율을 얹는다', () => {
    const result = withProseTier(GUIDE, 'premium')

    expect(result.startsWith(GUIDE)).toBe(true)
    expect(result).toContain(TERM_DISCIPLINE)
    expect(result).toContain(PREMIUM_PROSE_LAYER)
  })

  it('쉬운 말 사전이 프롬프트에 실제로 실린다 (금지만으로는 용어가 줄지 않는다)', () => {
    const result = withProseTier(GUIDE, 'standard')

    for (const [term, plain] of PLAIN_TERMS) expect(result).toContain(`${term} → ${plain}`)
    expect(result).toContain('다섯 개까지만')
  })

  it('🔴 품질 규율이 출력 형식보다 **뒤에** 온다 (모델은 뒤에 온 지시를 더 강하게 따른다)', () => {
    const result = withProseTier(`${GUIDE}\n\n[출력 형식]\n{...}`, 'premium')

    expect(result.indexOf('[출력 형식]')).toBeLessThan(result.indexOf('[서술 품질 규율'))
  })
})

describe('🔴 배선 — 무료 경로에 새지 않는다', () => {
  const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

  it('복채를 받는 풀이 3종은 premium 을 넘긴다', () => {
    for (const path of [
      'app/actions/ai/cheonjiin.ts',
      'app/actions/ai/fortune-analysis.ts',
      'app/actions/ai/wealth.ts',
    ]) {
      expect({ path, premium: read(path).includes("'premium'") }).toEqual({ path, premium: true })
    }
  })

  it('무료 경로(고민상담·오늘의 운세·흐름)는 표준 서술 그대로다', () => {
    // 출력이 44~245 토큰이라 문장 공예가 드러나지 않는다. 매출이 0인데 토큰만 늘 자리다.
    for (const path of ['app/actions/ai/shaman-chat.ts', 'app/actions/ai/year2026.ts', 'app/actions/ai/trend.ts']) {
      expect({ path, premium: read(path).includes("'premium'") }).toEqual({ path, premium: false })
    }
  })

  it('테마 풀이는 무료 미끼일 때 표준으로 내려간다 (표시 = 실차감과 같은 기준)', () => {
    expect(read('app/actions/theme-fortune/analyze.ts')).toContain("freeCut ? 'standard' : 'premium'")
  })
})

describe('규율 문면 — 물러지면 문장이 되돌아간다', () => {
  it('말투 충돌을 명시적으로 정리한다 (마스터·테마·종합사주가 서로 다른 말투를 지시하고 있었다)', () => {
    expect(PREMIUM_PROSE_LAYER).toContain('연극적 사극체')
    expect(PREMIUM_PROSE_LAYER).toContain('[분석 지침]이 지정한 것을 따르되')
  })

  it('«이렇게 써라»의 실연이 들어 있다 (금지만으로는 문장이 좋아지지 않는다)', () => {
    // 대비 예시가 이 레이어에서 가장 강한 레버다. 세 쌍이 유지되는지 본다.
    expect((PREMIUM_PROSE_LAYER.match(/✗/g) ?? []).length).toBeGreaterThanOrEqual(3)
    expect((PREMIUM_PROSE_LAYER.match(/○/g) ?? []).length).toBeGreaterThanOrEqual(3)
  })

  it('문장 공예 12조가 살아 있다', () => {
    for (const n of ['1.', '5.', '10.', '12.']) expect(PREMIUM_PROSE_LAYER).toContain(`\n${n} `)
  })

  it('🔴 「다른 사람에게 붙여도 되는 문장은 지운다」 조항이 남아 있다', () => {
    // AI 티의 정체는 어려운 말이 아니라 **누구에게나 해당되는 말**이다. 이 조항이 그것을 막는다.
    expect(PREMIUM_PROSE_LAYER).toContain('다른 사람의 풀이에도 그대로 들어갈 수 있다면')
  })

  it('상투구·기계 이음말 목록이 규율 본문에도 실려 있다', () => {
    for (const phrase of ['인생의 전환점', '무한한 가능성', '종합적으로 볼 때']) {
      expect(PREMIUM_PROSE_LAYER).toContain(phrase)
    }
  })
})

describe('냄새 검사 — 계측 도구이지 차단기가 아니다', () => {
  it('상투구·기계 이음말을 집어낸다', () => {
    const smelly = '종합적으로 볼 때 인생의 전환점이 다가오고 있습니다.'

    expect(findProseSmells(smelly)).toEqual(expect.arrayContaining(['인생의 전환점', '종합적으로 볼 때']))
  })

  it('구체적인 문장은 걸리지 않는다', () => {
    const clean = '3월과 9월에 문이 열립니다. 그전에 벌여둔 일이 있어야 열린 문이 쓸모가 있습니다.'

    expect(findProseSmells(clean)).toEqual([])
  })

  it('🔴 결과 문자열을 고치지 않는다 (유료 결과를 치환으로 손대면 문장이 부서진다)', () => {
    const original = '결론적으로 좋습니다.'
    findProseSmells(original)

    expect(original).toBe('결론적으로 좋습니다.')
  })

  it('두 목록은 겹치지 않는다 (상투구와 기계 이음말은 다른 결의 문제다)', () => {
    expect(PROSE_CLICHES.filter((phrase) => PROSE_MACHINE_TICS.includes(phrase))).toEqual([])
  })
})
