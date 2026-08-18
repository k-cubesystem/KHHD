/**
 * 사주 결과를 그리는 **두 화면이 갈라지지 않게** 지키는 회귀선 (2026-08-18).
 *
 * ## 이 프로젝트에서 두 번 났던 사고
 * 1. 기록 화면이 저장분의 2/3 를 안 그렸다 — 라이브는 15섹션, 기록은 4섹션이었다(15차c).
 * 2. 그걸 고치고 나니 이번엔 **라이브가 人(in) 을 통째로 빠뜨리고** 있었다. 저장본에는
 *    귀인·관계 조언·관상·손금 교차까지 있는데 결제한 화면에서 한 줄도 안 보였다(16차).
 *
 * 둘 다 «각자 그리다 한쪽만 늘어난» 경우다. 섹션을 하나 더 만들 때 **두 화면에 다 넣었는지**는
 * 눈으로 확인할 수 없다 — 파일이 멀리 떨어져 있고, 빠뜨려도 화면은 멀쩡해 보인다.
 *
 * 🔴 새 섹션을 추가하면 아래 목록에도 넣는다. 한쪽에만 넣으면 이 테스트가 먼저 운다.
 */
import fs from 'fs'
import path from 'path'

const ROOT = path.join(__dirname, '..', '..', '..')
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8')

const LIVE = 'app/protected/analysis/saju-result/saju-result-client.tsx'
const HISTORY = 'components/history/analysis-result-view.tsx'

/** 두 화면이 **모두** 그려야 하는 것. */
const SHARED_SECTIONS = [
  'SajuFreeSections', // 특별한 기운 · 과거 역추산 · 현재 공감
  'SajuDeepSections', // 구조 · 월별 · 직업 · 재물 · 인연 · 건강 · 타임라인 · 개운
  'SajuCrossAnalysisSection', // 교차 분석
] as const

describe('🔴 라이브 결과 화면과 기록 상세는 같은 것을 그린다', () => {
  it.each(SHARED_SECTIONS)('%s 가 두 화면 모두에 있다', (section) => {
    expect(`live/${section}: ${read(LIVE).includes(section)}`).toBe(`live/${section}: true`)
    expect(`history/${section}: ${read(HISTORY).includes(section)}`).toBe(`history/${section}: true`)
  })

  it('🔴 天·地·人 이 두 화면 모두에서 그려진다 (라이브가 人 을 빠뜨렸던 자리)', () => {
    const live = read(LIVE)
    const history = read(HISTORY)

    // 기록은 전용 섹션 컴포넌트 셋을 쓴다.
    for (const section of ['CheonSection', 'JiSection', 'InSection']) {
      expect(`history/${section}: ${history.includes(section)}`).toBe(`history/${section}: true`)
    }

    // 라이브는 天·地 를 접이 섹션(DetailSection)으로, 人 은 기록과 같은 InSection 을 재사용한다.
    expect(live).toMatch(/DetailSection[\s\S]{0,200}data\.cheon/)
    expect(live).toMatch(/DetailSection[\s\S]{0,200}data\.ji/)
    expect(live).toContain('<InSection')
  })

  it('🔴 세 번째 렌더러를 만들지 않았다 — 공용 파일을 통해서만 그린다', () => {
    const sharedModule = '@/components/analysis/saju/saju-reading-sections'

    expect(read(LIVE)).toContain(sharedModule)
    expect(read(HISTORY)).toContain(sharedModule)
  })

  it('게이트가 실제로 위반을 잡는다 (자가검증)', () => {
    const missing = `<DetailSection data={data.ji} />` // 人 이 없는 가짜 화면
    expect(missing.includes('<InSection')).toBe(false)
  })
})
