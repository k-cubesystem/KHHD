import fs from 'fs'
import path from 'path'
import { REANALYZE_ROUTES, buildReanalyzeRoute } from '../reanalyze-routes'

const APP_DIR = path.resolve(__dirname, '../../../../app')

function routePageExists(route: string): boolean {
  const rel = route.replace(/^\//, '')
  return fs.existsSync(path.join(APP_DIR, rel, 'page.tsx'))
}

describe('재분석 라우트 테이블', () => {
  it('모든 카테고리 라우트가 실존하는 page.tsx 로 해석된다 (404 방지)', () => {
    const missing: string[] = []
    for (const [category, route] of Object.entries(REANALYZE_ROUTES)) {
      if (!routePageExists(route)) missing.push(`${category} → ${route}`)
    }
    expect(missing).toEqual([])
  })

  it('SAJU·COMPATIBILITY 는 targetId 를 프리셋으로 부착한다', () => {
    expect(buildReanalyzeRoute('SAJU', 't1')).toBe('/protected/analysis/cheonjiin?targetId=t1')
    expect(buildReanalyzeRoute('COMPATIBILITY', 't2')).toBe('/protected/analysis/compatibility?targetId=t2')
  })

  it('스튜디오 계열(FACE/HAND/FENGSHUI)은 프리셋 없이 base 라우트만 반환한다', () => {
    expect(buildReanalyzeRoute('FACE', 't1')).toBe('/protected/studio/face')
    expect(buildReanalyzeRoute('HAND', 't1')).toBe('/protected/studio/palm')
    expect(buildReanalyzeRoute('FENGSHUI', 't1')).toBe('/protected/studio/fengshui')
  })
})
