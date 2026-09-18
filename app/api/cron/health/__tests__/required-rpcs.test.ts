/**
 * 헬스체크가 대조하는 RPC·표 목록은 «코드가 실제로 부르는 것»과 같아야 한다.
 *
 * 2026-09-18 이용권 전환 — 이용권 RPC(ent_*)가 사라지면 발급·사용이 무음으로 전부 멈춘다.
 * 반대로 더는 부르지 않는 복채 RPC 를 대조하면 지운 뒤 거짓 경보가 울린다.
 */
import { readFileSync } from 'fs'
import { join } from 'path'

const source = readFileSync(join(__dirname, '..', 'route.ts'), 'utf8')

function listBody(name: string): string {
  const start = source.indexOf(`const ${name} = [`)
  const end = source.indexOf('] as const', start)
  expect(start).toBeGreaterThan(-1)
  return source.slice(start, end)
}

describe('헬스체크 대조 목록', () => {
  it.each(['ent_grant', 'ent_consume', 'ent_refund', 'ent_revoke_for_payment', 'ent_admin_adjust'])(
    '이용권 RPC %s 를 대조한다',
    (rpc) => {
      expect(listBody('REQUIRED_RPCS')).toContain(`'${rpc}'`)
    }
  )

  it.each(['add_wallet_balance', 'deduct_wallet_balance', 'add_bokchae', 'get_charge_exempt_remaining'])(
    '더는 부르지 않는 복채 RPC %s 는 대조하지 않는다',
    (rpc) => {
      expect(listBody('REQUIRED_RPCS')).not.toContain(`'${rpc}'`)
    }
  )

  it.each(['entitlement_grants', 'subscription_usage', 'entitlement_ledger'])('이용권 표 %s 를 대조한다', (table) => {
    expect(listBody('REQUIRED_TABLES')).toContain(`'${table}'`)
  })
})
