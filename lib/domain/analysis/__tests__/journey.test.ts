import { buildJourney, JOURNEY_CORE_STAGES, JOURNEY_STAGE_ORDER, type JourneyStageId } from '../journey'

function statusOf(completed: string[], id: JourneyStageId, targetId?: string) {
  return buildJourney(completed, targetId).stages.find((s) => s.id === id)!.status
}

describe('buildJourney — 단계 순서/구성', () => {
  it('항상 5단계를 정해진 순서로 반환한다', () => {
    const { stages } = buildJourney([])
    expect(stages.map((s) => s.id)).toEqual(JOURNEY_STAGE_ORDER)
    expect(JOURNEY_STAGE_ORDER).toEqual(['SAJU', 'FACE', 'HAND', 'FENGSHUI', 'SAMHAP'])
    expect(JOURNEY_CORE_STAGES).toEqual(['SAJU', 'FACE', 'HAND', 'FENGSHUI'])
  })
})

describe('buildJourney — 아무것도 안 한 상태', () => {
  const j = buildJourney([])
  it('진행률 0, coreComplete/allComplete false', () => {
    expect(j.progress).toBe(0)
    expect(j.coreComplete).toBe(false)
    expect(j.allComplete).toBe(false)
  })
  it('첫 단계(사주)가 current, 종합은 locked', () => {
    expect(statusOf([], 'SAJU')).toBe('current')
    expect(statusOf([], 'SAMHAP')).toBe('locked')
    expect(j.next?.id).toBe('SAJU')
  })
  it('나머지 개인상은 todo(접근 가능, 잠김 아님)', () => {
    expect(statusOf([], 'FACE')).toBe('todo')
    expect(statusOf([], 'HAND')).toBe('todo')
    expect(statusOf([], 'FENGSHUI')).toBe('todo')
  })
})

describe('buildJourney — 부분 완료', () => {
  it('사주만 완료 → 다음은 관상, 사주는 done', () => {
    const j = buildJourney(['SAJU'])
    expect(statusOf(['SAJU'], 'SAJU')).toBe('done')
    expect(statusOf(['SAJU'], 'FACE')).toBe('current')
    expect(j.next?.id).toBe('FACE')
    expect(j.progress).toBe(20)
  })

  it('순서를 건너뛰어도 미완료 중 순서상 첫 단계가 current', () => {
    // 관상·풍수만 완료 → 미완료 개인상 중 첫 단계는 사주
    const j = buildJourney(['FACE', 'FENGSHUI'])
    expect(j.next?.id).toBe('SAJU')
    expect(statusOf(['FACE', 'FENGSHUI'], 'SAJU')).toBe('current')
    expect(statusOf(['FACE', 'FENGSHUI'], 'HAND')).toBe('todo')
    expect(statusOf(['FACE', 'FENGSHUI'], 'SAMHAP')).toBe('locked')
    expect(j.progress).toBe(40)
  })

  it('이물질 카테고리(TODAY 등)는 무시한다', () => {
    const j = buildJourney(['TODAY', 'WEALTH', 'SAJU'])
    expect(j.progress).toBe(20)
    expect(j.next?.id).toBe('FACE')
  })
})

describe('buildJourney — 개인 4상 완료(종합 해금)', () => {
  const core = ['SAJU', 'FACE', 'HAND', 'FENGSHUI']
  const j = buildJourney(core)

  it('coreComplete true, 종합이 current(해금)', () => {
    expect(j.coreComplete).toBe(true)
    expect(j.allComplete).toBe(false)
    expect(statusOf(core, 'SAMHAP')).toBe('current')
    expect(j.next?.id).toBe('SAMHAP')
  })
  it('진행률 80', () => {
    expect(j.progress).toBe(80)
  })
})

describe('buildJourney — 전부 완료', () => {
  const all = ['SAJU', 'FACE', 'HAND', 'FENGSHUI', 'SAMHAP']
  const j = buildJourney(all)

  it('allComplete true, next 없음, 진행률 100', () => {
    expect(j.allComplete).toBe(true)
    expect(j.progress).toBe(100)
    expect(j.next).toBeUndefined()
    expect(statusOf(all, 'SAMHAP')).toBe('done')
  })
})

describe('buildJourney — href target 주입', () => {
  it('targetId 없으면 순수 경로', () => {
    const j = buildJourney([])
    expect(j.stages.find((s) => s.id === 'FACE')!.href).toBe('/protected/studio/face')
    expect(j.stages.find((s) => s.id === 'SAMHAP')!.href).toBe('/protected/studio/samhap')
  })
  it('targetId 있으면 ?target= 부여(전 단계 동일 파라미터)', () => {
    const j = buildJourney(['SAJU'], 'mem-1')
    expect(j.stages.find((s) => s.id === 'SAJU')!.href).toBe('/protected/analysis/cheonjiin?target=mem-1')
    expect(j.stages.find((s) => s.id === 'HAND')!.href).toBe('/protected/studio/palm?target=mem-1')
    expect(j.stages.find((s) => s.id === 'SAMHAP')!.href).toBe('/protected/studio/samhap?target=mem-1')
  })
})
