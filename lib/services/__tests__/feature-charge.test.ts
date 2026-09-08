/**
 * 유료 풀이의 과금은 **서버 액션 안에서** 일어난다.
 *
 * ## 실제 구조 결함 (2026-09-01 발견 · 수정)
 * 사주·궁합·관상·손금·풍수는 화면이 `deductTalisman` 을 부른 뒤 분석 액션을 불렀다.
 * 액션은 `'use server'` export = 로그인만 하면 누구나 임의 인자로 부를 수 있는 공개
 * 엔드포인트이므로, 브라우저에서 액션을 직접 부르면 **차감 없이 유료 풀이가 나왔다.**
 * 관상·손금·풍수 액션에는 인증 검사조차 없었다.
 *
 * 이 파일은 두 가지를 잰다.
 *   1) chargeFeature 의 **동작** — 값 도출·실패 전달·환불 준비
 *   2) 5개 경로의 **배선** — 액션이 과금하고, 화면은 과금하지 않는가
 */
jest.mock('server-only', () => ({}))

const deductTalisman = jest.fn()
const refundBokchae = jest.fn()

jest.mock('@/app/actions/payment/wallet', () => ({
  deductTalisman: (...args: unknown[]) => deductTalisman(...args),
}))
jest.mock('@/lib/services/bokchae', () => ({
  refundBokchae: (...args: unknown[]) => refundBokchae(...args),
}))

import { readFileSync } from 'fs'
import { join, sep } from 'path'
import { chargeFeature } from '../feature-charge'
import { FEATURE_COST } from '@/lib/domain/payment/feature-costs'
import { UNLIMITED_BALANCE } from '@/lib/auth/privileges'

const ROOT = join(__dirname, '..', '..', '..')
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8')

beforeEach(() => {
  deductTalisman.mockReset()
  refundBokchae.mockReset()
})

describe('chargeFeature — 동작', () => {
  it('차감액을 FEATURE_COST 에서 도출한다 — 호출부가 숫자를 주지 않는다', async () => {
    deductTalisman.mockResolvedValue({ success: true, remainingBalance: 10 })
    await chargeFeature({ userId: 'u1', featureKey: 'SAJU', costKey: 'saju', label: '사주 풀이' })
    expect(deductTalisman).toHaveBeenCalledWith('SAJU', FEATURE_COST.saju.display)
  })

  it('차감 실패를 화면이 읽을 수 있는 형태로 그대로 전달한다 (errorType 이 모달을 띄운다)', async () => {
    deductTalisman.mockResolvedValue({
      success: false,
      error: '복채가 부족합니다.',
      errorType: 'INSUFFICIENT_BALANCE',
      currentTier: 'SINGLE',
    })
    const out = await chargeFeature({ userId: 'u1', featureKey: 'FACE', costKey: 'face', label: '관상 풀이' })
    expect(out.ok).toBe(false)
    if (out.ok) throw new Error('unreachable')
    expect(out.failure).toEqual({
      success: false,
      error: '복채가 부족합니다.',
      errorType: 'INSUFFICIENT_BALANCE',
      currentTier: 'SINGLE',
    })
  })

  it('실패 시 되돌릴 금액은 차감한 금액과 같다', async () => {
    deductTalisman.mockResolvedValue({ success: true, remainingBalance: 8 })
    const out = await chargeFeature({ userId: 'u1', featureKey: 'HAND', costKey: 'palm', label: '손금 풀이' })
    if (!out.ok) throw new Error('unreachable')
    await out.refundOnFailure?.()
    expect(refundBokchae).toHaveBeenCalledWith('u1', FEATURE_COST.palm.display, expect.any(String))
  })

  it('마스터·무제한은 실차감이 없으므로 되돌릴 것도 없다', async () => {
    deductTalisman.mockResolvedValue({ success: true, remainingBalance: UNLIMITED_BALANCE })
    const out = await chargeFeature({ userId: 'u1', featureKey: 'SAJU', costKey: 'saju', label: '사주 풀이' })
    if (!out.ok) throw new Error('unreachable')
    expect(out.refundOnFailure).toBeNull()
  })

  it('무료 기능은 차감 경로 자체를 타지 않는다 (0 을 차감하려 들면 wallet 이 거절한다)', async () => {
    const out = await chargeFeature({ userId: 'u1', featureKey: 'TODAY', costKey: 'today', label: '오늘의 운세' })
    expect(out.ok).toBe(true)
    expect(deductTalisman).not.toHaveBeenCalled()
  })

  it('환불이 던져도 호출부로 새어 나가지 않는다 — 실패 처리 중 2차 실패로 응답을 잃지 않는다', async () => {
    deductTalisman.mockResolvedValue({ success: true, remainingBalance: 4 })
    refundBokchae.mockRejectedValue(new Error('DB down'))
    const out = await chargeFeature({ userId: 'u1', featureKey: 'SAJU', costKey: 'saju', label: '사주 풀이' })
    if (!out.ok) throw new Error('unreachable')
    await expect(out.refundOnFailure?.()).resolves.toBeUndefined()
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

describe('배선 — 서버가 과금하고 화면은 하지 않는다', () => {
  it.each(WIRING)('$label 액션이 자기 안에서 과금한다', ({ action }) => {
    expect(read(action)).toContain('chargeFeature(')
  })

  it.each(WIRING)('$label 화면은 차감도 환급도 부르지 않는다', ({ screen }) => {
    const source = read(screen)
    for (const forbidden of ['deductTalisman', 'refundStudioCost']) {
      expect(`${screen} 에 ${forbidden} 없음: ${!source.includes(forbidden)}`).toBe(
        `${screen} 에 ${forbidden} 없음: true`
      )
    }
  })

  /**
   * 🔴 위의 WIRING 은 손으로 적는 목록이라, 새 화면이 생기면 목록에 없어서 통과해 버린다.
   * 이 잠금은 목록을 안 쓴다 — 저장소 전체에서 «차감을 부르는 파일»을 찾아
   * 그것이 전부 서버 모듈('use server')인지만 본다. 클라이언트가 차감할 수 있는 경로가
   * 하나라도 생기면, 그게 어느 화면이든 여기서 걸린다.
   */
  it('deductTalisman 을 부르는 곳은 전부 서버 모듈이다 (목록에 의존하지 않는 잠금)', () => {
    const { readdirSync, statSync } = jest.requireActual('fs') as typeof import('fs')
    const offenders: string[] = []
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        if (entry === 'node_modules' || entry === '.next' || entry === '__tests__' || entry.startsWith('.')) continue
        const full = join(dir, entry)
        if (statSync(full).isDirectory()) {
          walk(full)
          continue
        }
        if (!/\.tsx?$/.test(entry) || /\.test\.tsx?$/.test(entry)) continue
        const source = readFileSync(full, 'utf8')
        if (!/deductTalisman\s*\(/.test(source)) continue
        // 정본 구현·헬퍼·문서 주석은 대상이 아니다.
        const rel = full
          .slice(ROOT.length + 1)
          .split(sep)
          .join('/')
        if (rel === 'app/actions/payment/wallet.ts' || rel === 'lib/services/feature-charge.ts') continue
        if (!source.startsWith("'use server'")) offenders.push(rel)
      }
    }
    for (const dir of ['app', 'components', 'lib']) walk(join(ROOT, dir))
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

  it('이미지 액션 3종은 엣지 분기보다 **앞에서** 과금한다 — 엣지 사본에는 차감 코드가 없다', () => {
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
