/**
 * 유료 풀이의 이용권 사용은 **서버 액션 안에서** 일어난다.
 *
 * ## 실제 구조 결함 (2026-09-01 발견 · 수정 — 복채 시절)
 * 사주·궁합·관상·손금·풍수는 화면이 차감을 부른 뒤 분석 액션을 불렀다.
 * 액션은 `'use server'` export = 로그인만 하면 누구나 임의 인자로 부를 수 있는 공개
 * 엔드포인트이므로, 브라우저에서 액션을 직접 부르면 **차감 없이 유료 풀이가 나왔다.**
 * 2026-09-18 이용권 전환 뒤에도 같은 규율을 이용권(consumePass)에 그대로 건다.
 *
 * 이 파일은 세 가지를 잰다.
 *   1) chargeFeature 의 **동작** — 장 수 도출·실패 전달·되돌림 준비
 *   2) 과금 지점의 **배선** — 액션이 과금하고, 화면은 과금하지 않는가
 *   3) 사용·발급 함수의 **공개 표면 부재** — 'use server' 파일이 되내보내지 않는가
 */
jest.mock('server-only', () => ({}))

const consumePass = jest.fn()
const refundPass = jest.fn()

jest.mock('@/lib/services/entitlement', () => ({
  consumePass: (...args: unknown[]) => consumePass(...args),
  refundPass: (...args: unknown[]) => refundPass(...args),
}))
jest.mock('@/lib/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}))

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, sep } from 'path'
import { chargeFeature } from '../feature-charge'
import { FEATURE_COST } from '@/lib/domain/payment/feature-costs'
import { NO_PASS_ERROR, findBannedPassTerms, formatPassUnits } from '@/lib/domain/entitlement/pass'
import { logger } from '@/lib/utils/logger'

const ROOT = join(__dirname, '..', '..', '..')
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8')
const mockLogger = logger as jest.Mocked<typeof logger>

/** 저장소의 소스 파일(테스트 제외)을 상대 경로·내용으로 훑는다. */
function scanSources(dirs: readonly string[]): Array<{ rel: string; source: string }> {
  const out: Array<{ rel: string; source: string }> = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry === '.next' || entry === '__tests__' || entry.startsWith('.')) continue
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) {
        walk(full)
        continue
      }
      if (!/\.tsx?$/.test(entry) || /\.test\.tsx?$/.test(entry)) continue
      const rel = full
        .slice(ROOT.length + 1)
        .split(sep)
        .join('/')
      out.push({ rel, source: readFileSync(full, 'utf8') })
    }
  }
  for (const dir of dirs) walk(join(ROOT, dir))
  return out
}

const isServerAction = (source: string) => /^\s*['"]use server['"]/.test(source)

beforeEach(() => {
  jest.clearAllMocks()
  consumePass.mockReset()
  refundPass.mockReset()
})

describe('chargeFeature — 동작', () => {
  it('장 수를 FEATURE_COST 에서 도출한다 — 호출부가 숫자를 주지 않는다', async () => {
    consumePass.mockResolvedValue({ ok: true, bypass: false, ledgerIds: ['l1'], fromMembership: 1, fromPass: 0 })
    await chargeFeature({ userId: 'u1', featureKey: 'SAJU', costKey: 'saju', label: '사주 풀이' })
    expect(consumePass).toHaveBeenCalledWith({ userId: 'u1', featureKey: 'SAJU', units: FEATURE_COST.saju.display })
  })

  it('두 장짜리 풀이는 두 장을 쓴다 — 재물 심층·종합사주풀이', async () => {
    consumePass.mockResolvedValue({ ok: true, bypass: false, ledgerIds: ['l1'], fromMembership: 0, fromPass: 2 })
    await chargeFeature({ userId: 'u1', featureKey: 'SAMHAP', costKey: 'samhap', label: '종합사주풀이' })
    expect(consumePass).toHaveBeenCalledWith(expect.objectContaining({ units: FEATURE_COST.samhap.display }))
    expect(FEATURE_COST.samhap.display).toBe(2)
  })

  it('이용권이 모자라면 화면이 읽을 수 있는 NO_PASS 로 돌려준다 (errorType 이 안내 모달을 띄운다)', async () => {
    consumePass.mockResolvedValue({ ok: false, reason: 'INSUFFICIENT', memberAvailable: 0, passAvailable: 0 })
    const out = await chargeFeature({ userId: 'u1', featureKey: 'FACE', costKey: 'face', label: '관상 풀이' })
    expect(out.ok).toBe(false)
    if (out.ok) throw new Error('unreachable')
    expect(out.failure).toMatchObject({
      success: false,
      errorType: NO_PASS_ERROR,
      requiredUnits: FEATURE_COST.face.display,
    })
    expect(out.failure.error).toContain(formatPassUnits(FEATURE_COST.face.display))
    expect(findBannedPassTerms(out.failure.error)).toEqual([])
  })

  it('조회 오류는 «모자람»과 구분해 CHARGE_FAILED 로 돌려주고 경보를 남긴다', async () => {
    consumePass.mockResolvedValue({ ok: false, reason: 'ERROR', memberAvailable: 0, passAvailable: 0 })
    const out = await chargeFeature({ userId: 'u1', featureKey: 'SAJU', costKey: 'saju', label: '사주 풀이' })
    if (out.ok) throw new Error('unreachable')
    expect(out.failure.errorType).toBe('CHARGE_FAILED')
    expect(mockLogger.error.mock.calls[0][0]).toBeInstanceOf(Error)
  })

  it('실패 시 되돌리는 것은 이번에 쓴 원장 행 그대로다 — 다른 사용분을 건드리지 않는다', async () => {
    consumePass.mockResolvedValue({ ok: true, bypass: false, ledgerIds: ['l1', 'l2'], fromMembership: 1, fromPass: 1 })
    refundPass.mockResolvedValue(2)
    const out = await chargeFeature({ userId: 'u1', featureKey: 'HAND', costKey: 'palm', label: '손금 풀이' })
    if (!out.ok) throw new Error('unreachable')
    await out.refundOnFailure?.()
    expect(refundPass).toHaveBeenCalledWith('u1', ['l1', 'l2'])
  })

  it('관리자·검수 통과는 실사용이 없으므로 되돌릴 것도 없다', async () => {
    consumePass.mockResolvedValue({ ok: true, bypass: true, ledgerIds: [], fromMembership: 0, fromPass: 0 })
    const out = await chargeFeature({ userId: 'u1', featureKey: 'SAJU', costKey: 'saju', label: '사주 풀이' })
    if (!out.ok) throw new Error('unreachable')
    expect(out.refundOnFailure).toBeNull()
  })

  it('무료 기능은 사용 경로 자체를 타지 않는다', async () => {
    const out = await chargeFeature({ userId: 'u1', featureKey: 'TODAY', costKey: 'today', label: '오늘의 운세' })
    expect(out.ok).toBe(true)
    expect(consumePass).not.toHaveBeenCalled()
  })

  it('되돌림이 던져도 호출부로 새어 나가지 않는다 — 실패 처리 중 2차 실패로 응답을 잃지 않는다', async () => {
    consumePass.mockResolvedValue({ ok: true, bypass: false, ledgerIds: ['l1'], fromMembership: 1, fromPass: 0 })
    refundPass.mockRejectedValue(new Error('DB down'))
    const out = await chargeFeature({ userId: 'u1', featureKey: 'SAJU', costKey: 'saju', label: '사주 풀이' })
    if (!out.ok) throw new Error('unreachable')
    await expect(out.refundOnFailure?.()).resolves.toBeUndefined()
    expect(mockLogger.error).toHaveBeenCalled()
  })

  it('되돌리지 못하면(0장) Sentry 경보를 남긴다 — 사람이 수동으로 돌려줘야 한다', async () => {
    consumePass.mockResolvedValue({ ok: true, bypass: false, ledgerIds: ['l1'], fromMembership: 1, fromPass: 0 })
    refundPass.mockResolvedValue(0)
    const out = await chargeFeature({ userId: 'u1', featureKey: 'SAJU', costKey: 'saju', label: '사주 풀이' })
    if (!out.ok) throw new Error('unreachable')
    await out.refundOnFailure?.()
    expect(mockLogger.error.mock.calls[0][0]).toBeInstanceOf(Error)
  })
})

/** 과금 지점 5곳 — 액션(서버)과 그 화면(클라). */
const WIRING = [
  {
    label: '사주',
    action: 'app/actions/ai/cheonjiin.ts',
    screen: 'app/protected/analysis/saju-result/saju-result-client.tsx',
  },
  {
    label: '궁합',
    action: 'app/actions/ai/compatibility.ts',
    screen: 'app/protected/analysis/compatibility/compatibility-client.tsx',
  },
  { label: '관상', action: 'app/actions/ai/image.ts', screen: 'app/protected/studio/face/page.tsx' },
  { label: '손금', action: 'app/actions/ai/image.ts', screen: 'app/protected/studio/palm/page.tsx' },
  { label: '풍수', action: 'app/actions/ai/image.ts', screen: 'app/protected/studio/fengshui/page.tsx' },
] as const

/** 사용·되돌림 함수 이름 — 화면에서는 한 글자도 나오면 안 된다. 옛 복채 이름도 되살아나지 못하게 함께 본다. */
const CONSUME_CALLS = ['chargeFeature(', 'consumePass(', 'refundPass(']
const RETIRED_CALLS = ['deductTalisman', 'refundStudioCost', 'spendBokchae', 'refundBokchae']

/** 정본 구현 — 스캔 대상이 아니다. */
const CORE_MODULES = new Set(['lib/services/entitlement.ts', 'lib/services/feature-charge.ts'])

describe('배선 — 서버가 과금하고 화면은 하지 않는다', () => {
  it.each(WIRING)('$label 액션이 자기 안에서 과금한다', ({ action }) => {
    expect(read(action)).toContain('chargeFeature(')
  })

  it.each(WIRING)('$label 화면은 사용도 되돌림도 부르지 않는다', ({ screen }) => {
    const source = read(screen)
    for (const forbidden of [...CONSUME_CALLS, ...RETIRED_CALLS]) {
      expect(`${screen} 에 ${forbidden} 없음: ${!source.includes(forbidden)}`).toBe(
        `${screen} 에 ${forbidden} 없음: true`
      )
    }
  })

  /**
   * 🔴 위의 WIRING 은 손으로 적는 목록이라, 새 화면이 생기면 목록에 없어서 통과해 버린다.
   * 이 잠금은 목록을 안 쓴다 — 저장소 전체에서 «이용권을 쓰거나 되돌리는 파일»을 찾아
   * 그것이 전부 서버 액션('use server')인지만 본다. 클라이언트가 이용권을 쓸 수 있는 경로가
   * 하나라도 생기면, 그게 어느 화면이든 여기서 걸린다.
   */
  it('이용권을 쓰거나 되돌리는 곳은 전부 서버 액션이다 (목록에 의존하지 않는 잠금)', () => {
    const offenders = scanSources(['app', 'components', 'lib', 'hooks'])
      .filter(({ rel }) => !CORE_MODULES.has(rel))
      .filter(({ source }) => CONSUME_CALLS.some((call) => source.includes(call)))
      .filter(({ source }) => !isServerAction(source))
      .map(({ rel }) => rel)
    expect(offenders).toEqual([])
  })

  it('🔴 옛 복채 차감·환급 이름이 코드에 되살아나지 않는다', () => {
    const offenders = scanSources(['app', 'components', 'lib', 'hooks'])
      .filter(({ source }) => RETIRED_CALLS.some((name) => new RegExp(`\\b${name}\\s*\\(`).test(source)))
      .map(({ rel }) => rel)
    expect(offenders).toEqual([])
  })

  it('캐시가 있는 두 액션은 **캐시 확인 뒤**에 과금한다 — 캐시 적중은 새 연산이 아니다', () => {
    for (const rel of ['app/actions/ai/cheonjiin.ts', 'app/actions/ai/compatibility.ts']) {
      const source = read(rel)
      const cacheHitReturn = source.indexOf('cached: true')
      const chargeAt = source.indexOf('chargeFeature(')
      expect(`${rel}: 캐시 반환(${cacheHitReturn}) < 과금(${chargeAt})`).toBe(
        `${rel}: 캐시 반환(${cacheHitReturn}) < 과금(${chargeAt})`
      )
      expect(cacheHitReturn).toBeGreaterThan(-1)
      expect(chargeAt).toBeGreaterThan(cacheHitReturn)
    }
  })

  it('이미지 액션 3종은 엣지 분기보다 **앞에서** 과금한다 — 엣지 사본에는 사용 코드가 없다', () => {
    const source = read('app/actions/ai/image.ts')
    // 각 액션 본문을 잘라 그 안에서 순서를 본다.
    for (const fn of ['analyzeFaceForDestiny', 'analyzeInteriorForFengshui', 'analyzePalmReading']) {
      const start = source.indexOf(`export async function ${fn}(`)
      expect(`${fn} 존재: ${start > -1}`).toBe(`${fn} 존재: true`)
      const body = source.slice(start, start + 4000)
      const chargeAt = body.indexOf('chargeFeature(')
      const edgeAt = body.indexOf("isEdgeEnabled('ai-image')")
      expect(`${fn}: 과금(${chargeAt}) < 엣지(${edgeAt})`).toBe(`${fn}: 과금(${chargeAt}) < 엣지(${edgeAt})`)
      expect(chargeAt).toBeGreaterThan(-1)
      expect(edgeAt).toBeGreaterThan(chargeAt)
    }
  })

  it('이미지 액션 3종은 과금 전에 로그인을 확인한다 — 종전에는 인증 검사가 아예 없었다', () => {
    const source = read('app/actions/ai/image.ts')
    for (const fn of ['analyzeFaceForDestiny', 'analyzeInteriorForFengshui', 'analyzePalmReading']) {
      const start = source.indexOf(`export async function ${fn}(`)
      const body = source.slice(start, start + 4000)
      const authAt = body.indexOf('auth.getUser()')
      const chargeAt = body.indexOf('chargeFeature(')
      expect(`${fn}: 인증(${authAt}) < 과금(${chargeAt})`).toBe(`${fn}: 인증(${authAt}) < 과금(${chargeAt})`)
      expect(authAt).toBeGreaterThan(-1)
      expect(chargeAt).toBeGreaterThan(authAt)
    }
  })
})

/**
 * 🔴 사용·발급·회수 함수는 `userId` 를 인자로 받는다(= 인증 주체와 무관하다).
 * `'use server'` 파일이 이걸 되내보내면 로그인한 누구나 남의 이용권을 쓰거나 스스로 발급하는
 * 공개 엔드포인트가 된다. 복채 시절 wallet.ts 의 금액 가드·환급 가드가 막던 자리를,
 * 이제는 «애초에 공개 표면에 없다»로 막는다.
 */
describe('공개 표면 — 사용·발급·회수 함수는 서버 액션이 되내보내지 않는다', () => {
  const PRIVILEGED = [
    'consumePass',
    'refundPass',
    'grantPasses',
    'revokePaymentPasses',
    'settlePassPurchase',
    'chargeFeature',
  ]

  it('서버 액션 파일에 사용·발급 함수의 re-export 가 없다', () => {
    const offenders = scanSources(['app', 'lib'])
      .filter(({ source }) => isServerAction(source))
      .filter(({ source }) => {
        const reexports = source.match(/export\s*(?:type\s*)?\{[^}]*\}\s*from\s*['"][^'"]+['"]/g) ?? []
        const star =
          /export\s*\*\s*(?:as\s+\w+\s*)?from\s*['"]@\/lib\/services\/(entitlement|feature-charge|pass-revoke|pass-purchase)['"]/.test(
            source
          )
        return star || reexports.some((line) => PRIVILEGED.some((name) => new RegExp(`\\b${name}\\b`).test(line)))
      })
      .map(({ rel }) => rel)
    expect(offenders).toEqual([])
  })

  /**
   * re-export 만 막으면 «userId 를 받아 grantPasses 를 부르는 얇은 서버 액션»이 새 공개 발급 창구가 된다.
   * 발급·회수를 직접 부르는 서버 액션은 둘뿐이다 — 둘 다 본인 결제를 서버가 확인한 뒤에만 부른다.
   * 새 경로가 필요하면 이 목록을 고치는 일이 곧 보안 검토 요청이다.
   * (결제 승인은 발급을 직접 부르지 않고 확정 함수 settlePassPurchase 에 맡긴다 — 웹훅과 같은 길이다.)
   */
  it('발급·회수를 직접 부르는 서버 액션은 결제 승인·셀프 취소 둘뿐이다', () => {
    const callers = scanSources(['app', 'lib'])
      .filter(({ source }) => isServerAction(source))
      .filter(({ source }) => /\b(grantPasses|revokePaymentPasses|settlePassPurchase)\s*\(/.test(source))
      .map(({ rel }) => rel)
      .sort()
    expect(callers).toEqual(['app/actions/payment/cancel-request.ts', 'app/actions/payment/payment.ts'])
  })

  it('정본 모듈은 server-only 로 잠겨 있다 — 클라이언트 번들에 들어가지 못한다', () => {
    for (const rel of [
      'lib/services/entitlement.ts',
      'lib/services/feature-charge.ts',
      'lib/services/pass-revoke.ts',
      'lib/services/pass-purchase.ts',
    ]) {
      expect(`${rel}: ${read(rel).startsWith("import 'server-only'")}`).toBe(`${rel}: true`)
    }
  })

  it('이용권 읽기 액션은 인자로 사용자를 받지 않는다 — 세션 사용자만', () => {
    const source = read('app/actions/payment/passes.ts')
    expect(source).not.toMatch(/export async function \w+\(\s*userId/)
    for (const name of ['consumePass', 'refundPass', 'grantPasses']) {
      expect(`passes.ts 에 ${name}: ${source.includes(name)}`).toBe(`passes.ts 에 ${name}: false`)
    }
  })
})
