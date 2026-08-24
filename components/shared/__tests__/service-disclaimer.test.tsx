import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  AI_DISCLOSURE_ATTR,
  AI_DISCLOSURE_MARK,
  AI_DISCLOSURE_TERM,
  AI_DISCLOSURE_TEXT,
  ServiceDisclaimer,
  type DisclaimerTone,
} from '../ServiceDisclaimer'
import { ShareSaveButtons } from '@/components/studio/share-save-buttons'

/**
 * AI기본법 §31② 회귀 방지.
 *
 * 법이 요구하는 것은 「그 결과물이 **생성형 인공지능**에 의하여 생성되었다는 사실」의 표시다.
 * 문구를 다듬다가 그 말이 빠지면 화면은 멀쩡해 보이는데 의무만 무너진다 — 여기서 막는다.
 * 조사 정본: docs/REPORTS/RESEARCH-20260812-ai-basic-act.md
 */

jest.mock('html2canvas', () => ({ __esModule: true, default: jest.fn() }))
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

// jsdom 에 없는 것들 — 캡처 후 다운로드 경로가 여기서 죽으면 검증이 헛돈다.
beforeAll(() => {
  URL.createObjectURL = jest.fn(() => 'blob:test')
  URL.revokeObjectURL = jest.fn()
})

const TONES = Object.keys(AI_DISCLOSURE_TEXT) as DisclaimerTone[]
const REPO_ROOT = join(__dirname, '..', '..', '..')

describe('AI 고지 문언 — 법정 취지', () => {
  it.each(TONES)('«%s» 문안에 「생성형 인공지능」 이 살아 있다', (tone) => {
    expect(AI_DISCLOSURE_TEXT[tone]).toContain(AI_DISCLOSURE_TERM)
  })

  it.each(TONES)('«%s» 문안이 「생성」 을 말한다 — 「지었다」 로 물러서지 않는다', (tone) => {
    expect(AI_DISCLOSURE_TEXT[tone]).toContain('생성')
  })

  it('자리가 좁은 반출물용 짧은 표시도 법정 문언을 줄이지 않는다', () => {
    expect(AI_DISCLOSURE_MARK).toContain(AI_DISCLOSURE_TERM)
  })

  // 표시광고법 금지어(CLAUDE.md 복채 시스템 §문구 규율)가 고지에 섞여 들어오지 못하게.
  it.each(TONES)('«%s» 문안에 앱 금지어가 없다', (tone) => {
    for (const banned of ['매일', '무제한', '평생', '모두 이용', '정액']) {
      expect(AI_DISCLOSURE_TEXT[tone]).not.toContain(banned)
    }
  })
})

describe('ServiceDisclaimer 렌더', () => {
  it('기본은 풀이용 문안이고, 캡처 판정용 표식을 단다', () => {
    const { container } = render(<ServiceDisclaimer />)

    expect(screen.getByText(AI_DISCLOSURE_TEXT.reading)).not.toBeNull()
    expect(container.querySelector(`[${AI_DISCLOSURE_ATTR}]`)).not.toBeNull()
  })

  it.each(TONES)('tone=%s 를 주면 그 화면의 문안이 나온다', (tone) => {
    render(<ServiceDisclaimer tone={tone} />)
    expect(screen.getByText(AI_DISCLOSURE_TEXT[tone])).not.toBeNull()
  })

  it('사진 기반 풀이(관상·손금·풍수)는 사진을 살폈다는 사실을 함께 밝힌다', () => {
    render(<ServiceDisclaimer tone="photo" />)
    expect(screen.getByText(/사진을 생성형 인공지능이 살펴/)).not.toBeNull()
  })

  it('속풀이는 신위를 지우지 않고 층을 나눈다 — 짧아져도 «누가 말하는지»는 남는다', () => {
    render(<ServiceDisclaimer tone="chat" />)
    // 2026-08-24 CEO 지시로 두 문장 → 한 문장으로 줄였다. 길이는 자유지만 이 둘은 남아야 한다:
    // 「신위」(세계관을 지우지 않음) + 「생성형 인공지능」(법정 문언, 위 it.each 가 별도로 지킨다).
    expect(screen.getByText(/신위의 말은 생성형 인공지능이 냅니다/)).not.toBeNull()
  })

  it('🔴 속풀이 고지는 한 줄을 넘지 않는다 — 입력창 위에 상시 뜨는 자리다', () => {
    // 길어지면 대화를 가려 CEO 가 「없애 달라」고 한 상태로 돌아간다. 문장 부호로 길이를 잰다.
    const text = AI_DISCLOSURE_TEXT.chat
    expect(text.length).toBeLessThanOrEqual(24)
    expect(text.split('.').filter(Boolean)).toHaveLength(1)
  })
})

/**
 * 🔴 여기가 이 파일의 핵심이다.
 * 캡처물은 카카오·갤러리로 **외부 반출**되므로 화면 고지가 따라가지 않는다. html2canvas 에
 * 넘어가는 DOM 그 자체에 고지가 들어 있는지를 본다 — 「화면 어딘가에 있다」로는 부족하다.
 */
describe('캡처 반출물 — 이미지에 실제로 박히는가', () => {
  const html2canvas = jest.requireMock('html2canvas').default as jest.Mock
  let capturedHtml = ''

  beforeEach(() => {
    capturedHtml = ''
    html2canvas.mockReset()
    html2canvas.mockImplementation((element: HTMLElement) => {
      // 캡처 «시점» 의 DOM 을 찍어 둔다. 캡처가 끝나면 임시 노드는 걷히기 때문이다.
      capturedHtml = element.textContent ?? ''
      return Promise.resolve({
        toBlob: (cb: (blob: Blob) => void) => cb(new Blob(['png'], { type: 'image/png' })),
      })
    })
  })

  async function capture(children: React.ReactNode) {
    render(
      <>
        <div id="result-under-test">{children}</div>
        <ShareSaveButtons resultContainerId="result-under-test" analysisTitle="검증용 분석" />
      </>
    )
    await userEvent.click(screen.getByRole('button', { name: /이미지 저장/ }))
  }

  it('고지가 컨테이너 안에 있으면 그대로 캡처된다', async () => {
    await capture(
      <>
        <p>풀이 본문</p>
        <ServiceDisclaimer />
      </>
    )

    expect(html2canvas).toHaveBeenCalledTimes(1)
    expect(capturedHtml).toContain(AI_DISCLOSURE_TERM)
    // 화면에 이미 있던 고지를 두고 또 심지 않는다(두 줄로 겹쳐 보이면 안 된다).
    expect(document.querySelectorAll(`#result-under-test [${AI_DISCLOSURE_ATTR}]`)).toHaveLength(1)
  })

  it('🔴 고지가 빠진 화면이라도 표시 없는 이미지는 나가지 않는다', async () => {
    await capture(<p>고지를 깜빡한 풀이 본문</p>)

    expect(capturedHtml).toContain(AI_DISCLOSURE_TERM)
  })

  it('캡처용으로 심은 고지는 끝나면 걷어낸다 — 화면에 잔상을 남기지 않는다', async () => {
    await capture(<p>고지를 깜빡한 풀이 본문</p>)

    expect(document.querySelectorAll(`#result-under-test [${AI_DISCLOSURE_ATTR}]`)).toHaveLength(0)
  })
})

/**
 * 캡처 버튼을 새로 다는 화면이 생겼을 때 고지를 잊지 못하게 한다.
 * 위의 심기 장치는 최후 방어선이지 정상 경로가 아니다 — 화면에도 보여야 한다.
 */
describe('캡처 화면 부착 계약', () => {
  const SITES = [
    'app/protected/studio/face/page.tsx',
    'app/protected/studio/palm/page.tsx',
    'app/protected/studio/fengshui/page.tsx',
    'app/protected/studio/samhap/page.tsx',
    'app/protected/analysis/wealth/wealth-analysis-content.tsx',
    'app/protected/analysis/trend/[type]/trend-client.tsx',
    'app/protected/analysis/fortune/fortune-client.tsx',
    'app/protected/analysis/compatibility/compatibility-result.tsx',
    'app/protected/analysis/celebrity-compatibility/business-compatibility-client.tsx',
    'app/protected/analysis/new-year/page.tsx',
    'components/analysis/daily-fortune-view.tsx',
  ]

  it.each(SITES)('%s 가 고지를 함께 그린다', (relPath) => {
    const source = readFileSync(join(REPO_ROOT, relPath), 'utf8')

    expect(source).toContain('<ShareSaveButtons')
    expect(source).toContain('<ServiceDisclaimer')
  })
})

/** 외부에 그대로 공개되는 지면 — 비로그인도 본다. 고지가 빠지면 방어할 말이 없다. */
describe('외부 공개 지면 부착 계약', () => {
  const PUBLIC_PAGES = [
    'app/share/[token]/share-page-client.tsx',
    'app/share/saju/[token]/shared-saju-result.tsx',
    'app/invite/[code]/page.tsx',
  ]

  it.each(PUBLIC_PAGES)('%s 에 고지가 있다', (relPath) => {
    const source = readFileSync(join(REPO_ROOT, relPath), 'utf8')
    expect(source).toContain('<ServiceDisclaimer')
  })

  it('OG 카드는 풀이 요약을 태워 SNS 로 나가므로 표시를 함께 싣는다', () => {
    const source = readFileSync(join(REPO_ROOT, 'app/api/og/route.tsx'), 'utf8')
    expect(source).toContain(AI_DISCLOSURE_TERM)
  })

  it('신탁 알림·웹푸시 본문에 꼬리표가 붙는다', () => {
    const source = readFileSync(join(REPO_ROOT, 'app/actions/shrine/oracle.ts'), 'utf8')
    expect(source).toContain('AI_DISCLOSURE_MARK')
  })
})
