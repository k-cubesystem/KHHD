/**
 * 서비스 스위치 회귀선 — **있는 것을 안 읽고 새로 만들다 두 번 틀린 자리** (2026-08-19).
 *
 * 1. 허용 키를 손으로 새로 적어(`feature_saju` …) 실제 키(`feat_saju_today` …)와 어긋났다.
 *    → 스위치를 누르면 전부 「알 수 없는 설정입니다」로 거절됐다. **라이브에서 발견**.
 * 2. 저장할 때 `{ isActive }` 만 써서 `accessLevel`·`message` 를 **덮어 날렸다**.
 *    (`global_maintenance` 는 점검 안내 문구를, 기능 키들은 공개 범위를 그 안에 갖고 있다.)
 *
 * 두 실수 다 «단일 출처를 안 쓴» 탓이다. 그래서 여기서 세 가지를 못 박는다 —
 * 키 목록이 하나인가 · 화면과 어긋나지 않는가 · 저장이 병합인가.
 */
import fs from 'fs'
import path from 'path'
import { FEATURE_KEYS } from '@/lib/feature-flags'

const ROOT = path.join(__dirname, '..', '..', '..', '..')
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8')

const ACTION = 'app/admin/service-control/actions.ts'
const PAGE = 'app/admin/service-control/page.tsx'

describe('🔴 스위치 키는 단일 출처를 쓴다', () => {
  it('서버 액션이 키 목록을 다시 적지 않는다', () => {
    const source = read(ACTION)

    expect(source).toContain('FEATURE_KEYS')
    // 손으로 적은 허용 목록이 다시 생기면 실제 키와 어긋난다.
    expect(source).not.toMatch(/const ALLOWED_KEYS\s*=\s*\[/)
  })

  it('화면이 그리는 키가 전부 허용 목록에 있다', () => {
    const page = read(PAGE)
    const shown = [...page.matchAll(/\{\s*key:\s*'([^']+)'/g)].map((m) => m[1])

    expect(shown.length).toBeGreaterThanOrEqual(5)
    for (const key of shown) {
      expect(`${key} 가 FEATURE_KEYS 에 있다: ${(FEATURE_KEYS as readonly string[]).includes(key)}`).toBe(
        `${key} 가 FEATURE_KEYS 에 있다: true`
      )
    }
  })

  it('전체 차단 스위치가 목록에 있다', () => {
    expect(FEATURE_KEYS).toContain('global_maintenance')
  })
})

describe('🔴 저장은 덮어쓰기가 아니라 병합이다', () => {
  it('기존 값을 읽어서 펼친 뒤 isActive 만 바꾼다', () => {
    const source = read(ACTION)

    // 기존 값을 먼저 읽는다.
    expect(source).toMatch(/from\('system_settings'\)[\s\S]{0,120}\.eq\('key', key\)/)
    // 펼쳐서 병합한다 — accessLevel·message 가 살아남는 유일한 방법.
    expect(source).toMatch(/\{\s*\.\.\.before,\s*isActive\s*\}/)
  })

  it('화면은 DB 를 직접 쓰지 않는다 (감사·검증을 건너뛰게 된다)', () => {
    const page = read(PAGE)

    expect(page).not.toMatch(/from\('system_settings'\)[\s\S]{0,80}\.upsert\(/)
    expect(page).toContain('setServiceSwitch')
  })
})
