/**
 * 인기테마운세 상세 — 한 라우트가 세 가지 일을 한다(마스터 §3-3).
 *
 * ①구 5개 slug 리다이렉트 ②출하 테마 상세 ③그 밖은 허브.
 * ①이 살아 있어야 이미 나가 있는 북마크·공유 링크가 404 가 되지 않고, 그 다섯이 바로
 * 전 사용자 동일 「85점」을 띄우던 목업 주소들이다.
 */
import { act, fireEvent, render, screen } from '@testing-library/react'
import { redirect } from 'next/navigation'
import ThemeAnalysisPage from '@/app/protected/analysis/theme/[type]/page'
import { getDestinyTargets } from '@/app/actions/user/destiny'
import { analyzeThemeFortune } from '@/app/actions/theme-fortune/analyze'
import { themeById, themeReadingCostLabel, themeReadingPath } from '@/lib/domain/theme-fortune/themes'
import { themeResolver } from '@/lib/domain/theme-fortune/resolvers'

jest.mock('next/navigation', () => ({
  redirect: jest.fn((url: string) => {
    // 실제 next/navigation 과 같은 거동 — redirect 는 던진다(뒤 코드가 안 돈다).
    throw new Error(`REDIRECT:${url}`)
  }),
}))
jest.mock('@/app/actions/user/destiny', () => ({ getDestinyTargets: jest.fn() }))
jest.mock('@/app/actions/theme-fortune/analyze', () => ({ analyzeThemeFortune: jest.fn() }))
jest.mock('sonner', () => ({ toast: { error: jest.fn(), success: jest.fn() } }))
jest.mock('@/components/studio/share-save-buttons', () => ({ ShareSaveButtons: () => null }))
jest.mock('@/components/membership/membership-nudge-modal', () => ({ MembershipNudgeModal: () => null }))

const mockTargets = getDestinyTargets as jest.MockedFunction<typeof getDestinyTargets>
const mockAnalyze = analyzeThemeFortune as jest.MockedFunction<typeof analyzeThemeFortune>
const mockRedirect = redirect as unknown as jest.Mock

const SELF = {
  id: 'target-1',
  owner_id: 'user-1',
  name: '홍길동',
  relation_type: '본인',
  birth_date: '1988-03-14',
  birth_time: '09:30',
  calendar_type: 'solar' as const,
  gender: 'male' as const,
  avatar_url: null,
  face_image_url: null,
  hand_image_url: null,
  home_address: null,
  target_type: 'self' as const,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  is_leap_month: false,
}

const READING_THEME = 'leave-or-stay'

async function renderDetail(type: string) {
  const ui = await ThemeAnalysisPage({ params: Promise.resolve({ type }) })
  return render(ui)
}

beforeEach(() => {
  jest.clearAllMocks()
  mockTargets.mockResolvedValue([SELF])
})

describe('라우트 — 세 갈래', () => {
  it('🔴 구 5개 slug 는 진짜 화면으로 넘어간다 (북마크가 404 가 되지 않는다)', async () => {
    const expected: Record<string, string> = {
      wealth: '/protected/analysis/wealth',
      love: '/protected/analysis/trend/love',
      career: '/protected/analysis/trend/career',
      exam: '/protected/analysis/trend/exam',
      estate: '/protected/analysis/trend/estate',
    }

    for (const [slug, href] of Object.entries(expected)) {
      await expect(renderDetail(slug)).rejects.toThrow(`REDIRECT:${href}`)
    }
  })

  it('모르는 slug·출하 안 한 테마는 허브로 보낸다', async () => {
    for (const slug of ['없는테마', 'work-friction', 'constructor']) {
      await expect(renderDetail(slug)).rejects.toThrow('REDIRECT:/protected/analysis')
    }
  })

  it('출하 테마 slug 는 리다이렉트 없이 상세를 그린다', async () => {
    await renderDetail(READING_THEME)

    expect(mockRedirect).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(themeById(READING_THEME)?.title)
  })

  it('구 slug 가 테마 id 와 겹치지 않는다 (겹치면 상세가 영원히 안 열린다)', () => {
    for (const slug of ['wealth', 'love', 'career', 'exam', 'estate']) {
      expect(themeById(slug)).toBeNull()
    }
  })
})

describe('상세 — 🔴 페이지 로드는 정적이다', () => {
  it('그리기만 해서는 분석 액션이 돌지 않는다 (마운트마다 Gemini 사고 재발 방지선)', async () => {
    await renderDetail(READING_THEME)

    expect(mockAnalyze).not.toHaveBeenCalled()
  })

  it('분석은 버튼에서만 시작한다', async () => {
    await renderDetail(READING_THEME)

    expect(screen.getByRole('button', { name: /풀이 보기/ })).not.toBeNull()
  })
})

describe('상세 — 누르기 전에 밝히는 것', () => {
  it('썸네일·후킹 제목·서브카피가 카드에서 본 그대로다', async () => {
    const theme = themeById(READING_THEME)
    if (!theme) throw new Error('테마가 없다')
    const { container } = await renderDetail(READING_THEME)

    expect(screen.getByText(theme.subcopy)).not.toBeNull()
    expect(container.querySelector(`img[src="${theme.thumbnail}"]`)).not.toBeNull()
  })

  it('🔴 복채가 단일 소스에서 나온 문자열로 찍힌다', async () => {
    const theme = themeById(READING_THEME)
    if (!theme) throw new Error('테마가 없다')
    await renderDetail(READING_THEME)

    // 배지와 버튼이 같은 값을 말한다 — 눌러서 얼마가 나가는지 두 곳이 어긋나지 않는다.
    expect(screen.getAllByText(new RegExp(themeReadingCostLabel(theme))).length).toBeGreaterThan(1)
  })

  it('무엇을 보는 풀이인지와 무엇을 묻지 않는지를 함께 적는다', async () => {
    await renderDetail(READING_THEME)

    expect(screen.getByText(themeResolver(READING_THEME)?.prompt.question ?? '')).not.toBeNull()
    // 입력 최소화가 곧 법적 방어다(직장·재물 §5 C-1 ⑤).
    expect(screen.getByText(/회사·직무를 묻지 않고/)).not.toBeNull()
  })

  it('면책 고지가 붙어 있다', async () => {
    await renderDetail(READING_THEME)

    expect(screen.getByText(/참고용입니다/)).not.toBeNull()
  })

  it('다음 걸음 — 관련 테마와 고민상담으로 가는 길이 풀이 전에도 열려 있다', async () => {
    const { container } = await renderDetail(READING_THEME)
    const hrefs = Array.from(container.querySelectorAll('a')).map((anchor) => anchor.getAttribute('href'))

    expect(hrefs).toContain('/protected/ai-shaman')
    expect(hrefs).toContain(themeReadingPath('what-next'))
    expect(hrefs).toContain('/protected/analysis/theme')
  })
})

describe('상세 — 강화 고지 (마스터 §9-4 · §9-5 6번)', () => {
  it('🔴 투자 부류는 결제 «전»에도 고지 박스가 보인다', async () => {
    // 돈이 나가기 전에 「투자 자문이 아니다」를 봐야 고지가 고지다 — 그래서 결과가 아니라
    // 히어로 아래 선다. 문구는 themes.ts 상수 단일 소스.
    await renderDetail('nothing-left')

    expect(screen.getByText(/투자 자문이 아닙니다/)).not.toBeNull()
  })

  it('부류 밖 테마에는 박스를 세우지 않는다 (고지가 흔해지면 아무도 읽지 않는다)', async () => {
    await renderDetail(READING_THEME)

    expect(screen.queryByText(/투자 자문이 아닙니다/)).toBeNull()
  })
})

describe('상세 — 결과 골격 9섹션 (마스터 §4-2)', () => {
  const READING = {
    themeId: READING_THEME,
    targetId: SELF.id,
    targetName: '홍길동',
    verdict: {
      themeId: READING_THEME,
      verdictLabel: { key: 'hold', label: '버티는 결', note: '머무는 것도 하나의 선택입니다.' },
      matrix: {
        rowIndicatorKey: 'gwan_pressure',
        colIndicatorKey: 'siksang_pull',
        rowLabels: ['눌리는 힘 낮음', '눌리는 힘 높음'] as [string, string],
        colLabels: ['나가려는 힘 낮음', '나가려는 힘 높음'] as [string, string],
        cells: [
          [
            { key: 'elsewhere', label: '자리보다 다른 데 있는 결', note: '자리가 아닐 수 있습니다.', openEnded: true },
            { key: 'rising', label: '스스로 뜨는 결', note: '밖으로 도는 힘이 큽니다.' },
          ],
          [
            { key: 'hold', label: '버티는 결', note: '머무는 것도 하나의 선택입니다.' },
            { key: 'pushed', label: '밀려나는 결', note: '둘이 겹칩니다.' },
          ],
        ] as [
          [
            { key: string; label: string; note: string; openEnded?: boolean },
            { key: string; label: string; note: string },
          ],
          [{ key: string; label: string; note: string }, { key: string; label: string; note: string }],
        ],
      },
      indicators: [
        { key: 'gwan_pressure', label: '눌리는 힘', score: 70, band: 'high' as const, basis: '편관 2 · 정관 1' },
        { key: 'siksang_pull', label: '나가려는 힘', score: 20, band: 'low' as const, basis: '식상 없음' },
        { key: 'year_gate', label: '올해의 문', score: 55, band: 'mid' as const, basis: '세운 직업운 보통' },
      ] as const,
      timings: [
        { kind: 'opportunity' as const, year: 2026, months: [3, 9], basis: '2026 세운 직업운 좋음' },
        { kind: 'caution' as const, year: 2026, months: [7], basis: '2026 세운이 일주와 지지충' },
      ],
      ruleHits: [] as string[],
      pastHint: { period: '2024년', basis: '2024 세운 편관이 일주와 충' } as { period: string; basis: string } | null,
    },
    narration: {
      headline: '지금 답답한 것은 자리보다 시기에서 옵니다.',
      situation: '관성이 눌리는 구간입니다.',
      indicatorNotes: ['눌림이 큽니다', '밖으로 도는 힘은 약합니다', '올해 문은 보통입니다'],
      timingNotes: ['3월과 9월이 열립니다', '7월은 말을 아끼는 편이 좋습니다'],
      actions: ['기록을 남기세요', '쉬는 날을 정하세요', '한 사람에게만 털어놓으세요'],
      pastEcho: '2024년 무렵 자리에 변동이 있었을 것입니다.',
      caution: '이 풀이는 결정을 대신하지 않습니다.',
    },
    analyzedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  }

  async function renderResult(overrides: Partial<typeof READING> = {}, cached = false) {
    mockAnalyze.mockResolvedValue({ success: true, reading: { ...READING, ...overrides }, cached })
    const view = await renderDetail(READING_THEME)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /풀이 보기/ }))
    })
    return view
  }

  it('①~⑦ 섹션이 판정과 서술에서 각각 나온다', async () => {
    await renderResult()

    expect(screen.getByText(READING.narration.headline)).not.toBeNull() // ② 한 줄 답 [L3]
    expect(screen.getByText('눌리는 힘')).not.toBeNull() // ③ 지표 [L1→L2]
    expect(screen.getByText('편관 2 · 정관 1')).not.toBeNull() // ③ 근거 [L1]
    expect(screen.getByText(READING.narration.situation)).not.toBeNull() // ④ 지금 상황 [L3]
    expect(screen.getByText('2026년')).not.toBeNull() // ⑤ 시기 [L1→L2]
    expect(screen.getByText('기록을 남기세요')).not.toBeNull() // ⑥ 할 일 [L3]
    expect(screen.getByText(READING.narration.pastEcho)).not.toBeNull() // ⑦ 되짚기 [L1→L3]
  })

  it('🔴 지표에 숫자 점수가 나가지 않는다 — 밴드와 막대 길이뿐', async () => {
    const { container } = await renderResult()

    // 「85점」 목업이 이 라우트가 접수한 라이브 버그였다(마스터 §1-1·§9-1).
    expect(container.textContent).not.toMatch(/70|55점|점수/)
    expect(screen.getByText('높음')).not.toBeNull()
    expect(container.querySelector('[style*="width: 70%"]')).not.toBeNull()
  })

  it('판정표 네 칸이 다 보이고 내 칸만 표시된다 (골라준 게 아니라 갈라준 것)', async () => {
    const { container } = await renderResult()

    for (const cell of READING.verdict.matrix.cells.flat()) {
      expect(screen.getByText(cell.label)).not.toBeNull()
    }
    expect(container.querySelectorAll('[aria-current="true"]')).toHaveLength(1)
    expect(container.querySelector('[aria-current="true"]')?.textContent).toBe('버티는 결')
    expect(screen.getByText(/골라드리지 않습니다/)).not.toBeNull()
  })

  it('12개월 띠가 열리는 달·막히는 달을 가른다', async () => {
    const { container } = await renderResult()
    const strip = Array.from(container.querySelectorAll('li')).filter((item) =>
      /^\d{1,2}$/.test(item.textContent ?? '')
    )

    expect(strip).toHaveLength(12)
    expect(strip[2].className).toMatch(/gold/) // 3월 = 열림
    expect(strip[6].className).not.toMatch(/gold/) // 7월 = 막힘
  })

  it('🔴 판정에 근거가 없으면 되짚기 칸을 아예 그리지 않는다', async () => {
    await renderResult({
      verdict: { ...READING.verdict, pastHint: null },
      narration: { ...READING.narration, pastEcho: '' },
    })

    expect(screen.queryByText('되짚어 보면')).toBeNull()
  })

  it('저장본을 되읽었으면 며칠 전 풀이인지 밝힌다', async () => {
    await renderResult({}, true)

    expect(screen.getByText('3일 전 풀이')).not.toBeNull()
  })

  it('🔴 재분석은 복채가 다시 나간다고 밝히고 두 번 눌러야 돈다', async () => {
    const theme = themeById(READING_THEME)
    if (!theme) throw new Error('테마가 없다')
    await renderResult()
    expect(mockAnalyze).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: '다시 풀기' }))
    expect(screen.getByText(new RegExp(`다시 풀면 ${themeReadingCostLabel(theme)}가 새로 나갑니다`))).not.toBeNull()
    expect(mockAnalyze).toHaveBeenCalledTimes(1)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '다시 풀기' }))
    })
    expect(mockAnalyze).toHaveBeenLastCalledWith({ themeId: READING_THEME, targetId: SELF.id, force: true })
  })

  it('🔴 「자리보다 다른 데 있는 결」이면 결론 대신 상담을 앞에 세운다', async () => {
    const elsewhere = READING.verdict.matrix.cells[0][0]
    const { container } = await renderResult({
      verdict: { ...READING.verdict, verdictLabel: elsewhere },
    })

    const nextStepHrefs = Array.from(container.querySelectorAll('section a')).map((a) => a.getAttribute('href'))
    expect(nextStepHrefs[nextStepHrefs.indexOf('/protected/ai-shaman')]).toBe('/protected/ai-shaman')
    expect(nextStepHrefs.indexOf('/protected/ai-shaman')).toBeLessThan(
      nextStepHrefs.indexOf(themeReadingPath('what-next'))
    )
  })
})

describe('상세 — 판정이 없는 테마', () => {
  it('출하했지만 판정이 없으면 「준비 중」으로 닫고 버튼을 내주지 않는다', async () => {
    // 카드가 복채를 적고 링크가 여기로 오는데 화면이 열리면, 돈은 받고 결과가 없는 자리가 된다.
    // 예시는 관상 테마 — 관상 3종은 사주 골격으로 판정할 수 없어(입력=FACE 판정, 관상 세트
    // §5-6) 별도 파생층이 설 때까지 판정 없이 남는 유일한 출하 갈래다.
    await renderDetail('first-impression')

    expect(screen.getByText('이 테마의 풀이는 준비 중입니다.')).not.toBeNull()
    expect(screen.queryByRole('button', { name: /풀이 보기/ })).toBeNull()
  })
})

describe('상세 — 사주가 없을 때', () => {
  it('막다른 길을 만들지 않는다 (등록 화면으로 보낸다)', async () => {
    mockTargets.mockResolvedValue([])
    const { container } = await renderDetail(READING_THEME)

    expect(screen.getByText('등록된 사주 정보가 없습니다.')).not.toBeNull()
    expect(Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'))).toContain(
      '/protected/settings'
    )
  })
})
