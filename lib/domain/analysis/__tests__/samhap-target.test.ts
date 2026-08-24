/**
 * 종합사주풀이 대상 해석 — «본인은 target 을 붙이지 않는다» 규약을 못 박는 테스트.
 *
 * 이 규약이 깨지면 화면은 멀쩡한데 요건 표만 영영 비어 보인다(본인 id 로 family_members 를
 * 뒤지다 못 찾아 생년월일이 통째로 null 이 된다). 눈으로는 안 잡히는 종류라 테스트가 진다.
 */
import { resolveSamhapTarget, samhapTargetId, samhapTargetQuery } from '../samhap-target'

const SELF = { id: 'user-1', target_type: 'self' as const }
const MOM = { id: 'fam-1', target_type: 'family' as const }
const SON = { id: 'fam-2', target_type: 'family' as const }

describe('samhapTargetId — 본인은 undefined', () => {
  it('본인 행은 id 가 있어도 넘기지 않는다', () => {
    expect(samhapTargetId(SELF)).toBeUndefined()
  })

  it('가족은 id 를 그대로 넘긴다', () => {
    expect(samhapTargetId(MOM)).toBe('fam-1')
  })

  it('선택 전(null·undefined)이면 undefined', () => {
    expect(samhapTargetId(null)).toBeUndefined()
    expect(samhapTargetId(undefined)).toBeUndefined()
  })
})

describe('samhapTargetQuery — 링크·URL 이 쓰는 유일한 출처', () => {
  it('본인은 빈 문자열이라 맨 경로가 된다', () => {
    expect(samhapTargetQuery(SELF)).toBe('')
  })

  it('가족은 ?target= 이 붙는다', () => {
    expect(samhapTargetQuery(SON)).toBe('?target=fam-2')
  })
})

describe('resolveSamhapTarget — 처음 설 자리', () => {
  const targets = [SELF, MOM, SON]

  it('쿼리로 지목된 가족이 있으면 그 사람', () => {
    expect(resolveSamhapTarget(targets, 'fam-2')).toBe(SON)
  })

  it('지목이 없으면 본인이 기본', () => {
    expect(resolveSamhapTarget(targets, null)).toBe(SELF)
  })

  it('목록에 없는 id 는 조용히 무시하고 본인으로 선다 (남의 id 로 조회를 걸지 않는다)', () => {
    expect(resolveSamhapTarget(targets, 'someone-elses-id')).toBe(SELF)
  })

  it('본인 행이 없으면 첫 행, 목록이 비면 null', () => {
    expect(resolveSamhapTarget([MOM, SON], null)).toBe(MOM)
    expect(resolveSamhapTarget([], 'fam-1')).toBeNull()
  })
})
