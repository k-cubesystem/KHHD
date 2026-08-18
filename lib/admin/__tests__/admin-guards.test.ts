/**
 * 어드민 서버액션 **관문·감사 회귀선** (2026-08-18).
 *
 * ## 🔴 이 테스트가 막는 두 가지
 *
 * **① 무방비 공개 엔드포인트.** `'use server'` export 는 어드민 화면에서만 부른다고 안전한 게
 * 아니다 — 액션 ID 만 알면 누구나 부를 수 있는 **공개 HTTP 엔드포인트**다. 실측에서
 * `app/admin/notifications/actions.ts` 의 `runManualAutomation`(활성 구독자 **전원에게 실제 발송**)과
 * `updateNotificationSetting`, `app/admin/payments/actions.ts` 의 결제 내역 조회가
 * **권한 검사 0건**으로 열려 있었다.
 *
 * **② 흔적 없는 조작.** 복채 지급·가격 편집·알림 발송이 감사에 안 남았다
 * (`admin_audit_log` 실 0행 / `logAdminAction` 은 회원 관리 4곳뿐).
 * 「누가 언제 무엇을 바꿨나」가 없으면 사고 뒤 되돌릴 근거가 없다.
 *
 * 🔴 어드민 액션 파일을 새로 만들면 이 목록에 넣는다.
 */
import fs from 'fs'
import path from 'path'
import { ADMIN_AUDIT_ACTIONS, ADMIN_AUDIT_LABELS, describeAuditAction } from '@/lib/admin/audit-labels'

const ROOT = path.join(__dirname, '..', '..', '..')
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8')

function adminActionFiles(): string[] {
  const dir = path.join(ROOT, 'app', 'admin')
  const out: string[] = []
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name)
      if (e.isDirectory()) walk(full)
      else if (e.name === 'actions.ts') out.push(path.relative(ROOT, full).split(path.sep).join('/'))
    }
  }
  walk(dir)
  return out
}

/** 권한을 실제로 막는 표현들. 이 중 하나라도 있어야 관문이 있다고 본다. */
const GUARD_PATTERNS = [/requireAdmin\s*\(/, /checkAdmin\w*\s*\(/, /assertAdmin\s*\(/, /getUserRole\s*\(/]

describe('🔴 어드민 서버액션은 반드시 권한 관문을 지난다', () => {
  const files = adminActionFiles()

  it('스캔이 실제로 파일을 찾는다 (게이트가 헛돌지 않는지)', () => {
    expect(files.length).toBeGreaterThanOrEqual(5)
    expect(files).toContain('app/admin/notifications/actions.ts')
    expect(files).toContain('app/admin/payments/actions.ts')
  })

  it.each(adminActionFiles())('%s 에 권한 검사가 있다', (file) => {
    const source = read(file)
    const guarded = GUARD_PATTERNS.some((re) => re.test(source))

    expect(`${file}: ${guarded}`).toBe(`${file}: true`)
  })

  it('🔴 전체 차단 스위치는 브라우저가 아니라 서버 액션이 쓴다', () => {
    const page = read('app/admin/service-control/page.tsx')
    const action = read('app/admin/service-control/actions.ts')

    // 화면이 system_settings 를 직접 upsert 하면 감사도 서버 검증도 없다.
    expect(page).not.toMatch(/from\('system_settings'\)[\s\S]{0,80}\.upsert\(/)
    expect(page).toContain('setServiceSwitch')
    // 임의 키 덮어쓰기 차단 — 키 목록은 lib/feature-flags 단일 출처를 쓴다
    expect(action).toContain('FEATURE_KEYS')
    expect(action).toContain("action: 'service_toggle'")
  })

  it('🔴 대량 발송 액션은 requireAdmin 으로 막혀 있다', () => {
    const source = read('app/admin/notifications/actions.ts')

    // 발송 함수 본문 앞에 관문이 있어야 한다.
    expect(source).toMatch(/export async function runManualAutomation\(\)[\s\S]{0,400}requireAdmin\(\)/)
    expect(source).toMatch(/export async function updateNotificationSetting\([\s\S]{0,400}requireAdmin\(\)/)
  })
})

describe('🔴 돈·가격·발신 조작은 감사에 남는다', () => {
  const MUST_AUDIT: Array<{ file: string; action: string }> = [
    { file: 'app/admin/subscriptions/actions.ts', action: 'talisman_grant' },
    { file: 'app/admin/subscriptions/actions.ts', action: 'subscription_status_change' },
    { file: 'app/admin/membership/plans/actions.ts', action: 'plan_update' },
    { file: 'app/admin/membership/plans/actions.ts', action: 'plan_toggle' },
    { file: 'app/admin/membership/plans/actions.ts', action: 'product_update' },
    { file: 'app/admin/notifications/actions.ts', action: 'notification_setting_change' },
    { file: 'app/admin/users/actions.ts', action: 'balance_adjust' },
    { file: 'app/admin/users/actions.ts', action: 'role_change' },
    { file: 'app/admin/users/actions.ts', action: 'user_delete' },
    { file: 'app/admin/service-control/actions.ts', action: 'service_toggle' },
  ]

  it.each(MUST_AUDIT)('$file 가 $action 을 기록한다', ({ file, action }) => {
    const source = read(file)

    expect(`${file}/logAdminAction: ${source.includes('logAdminAction')}`).toBe(`${file}/logAdminAction: true`)
    expect(`${file}/${action}: ${source.includes(`action: '${action}'`)}`).toBe(`${file}/${action}: true`)
  })
})

describe('🔴 감사 라벨은 단일 출처를 쓴다', () => {
  it('모든 액션에 우리말 라벨이 있다 (영문 코드 노출 금지)', () => {
    for (const action of ADMIN_AUDIT_ACTIONS) {
      const { label } = ADMIN_AUDIT_LABELS[action]
      expect(`${action}: ${label.length > 0}`).toBe(`${action}: true`)
      // 라벨이 코드 자체면 우리말로 안 바꾼 것이다.
      expect(`${action}: ${label === action}`).toBe(`${action}: false`)
    }
  })

  it('모르는 액션도 영문 코드를 그대로 노출하지 않는다', () => {
    expect(describeAuditAction('something_new').label).toBe('기타 조작')
  })

  it('감사 화면이 라벨 표를 다시 만들지 않는다', () => {
    const page = read('app/admin/audit/page.tsx')

    expect(page).toContain('describeAuditAction')
    expect(page).not.toContain('const ACTION_LABEL')
  })
})
