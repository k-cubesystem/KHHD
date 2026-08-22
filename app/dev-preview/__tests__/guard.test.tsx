/**
 * @jest-environment node
 *
 * 프로덕션 가드 회귀 테스트.
 *
 * 미리보기는 로그인 없이 서는 화면이라, 실수로 프로덕션에 배포되면 고객이 목 데이터 화면을
 * 그대로 보게 된다. 세 입구(목록·장면·장면표 API)가 **전부** 닫히는지 잡는다.
 *
 * 🔴 `process.env.NODE_ENV` 를 바꿔치기하는 방식은 여기서 안 통한다 — Next 의 변환기가 그 표현을
 * 빌드 시점에 문자열 리터럴로 **인라인**하기 때문이다(그래서 실제 프로덕션 빌드에서는 가드가
 * 확실히 먹는다). 대신 판정 함수(`isPreviewEnabled`)를 목으로 세워 **배선**을 잡는다:
 * 「가드가 아니라고 하면 라우트가 정말 notFound() 하는가」. 판정 자체의 옳고 그름
 * (production 만 false)은 `lib/domain/dev-preview/__tests__/scenes.test.ts` 가 따로 본다.
 *
 * node 환경인 이유: 장면표 라우트가 `next/server` 를 쓰는데 jsdom 에는 Request·Response 전역이
 * 없어 모듈 로드부터 터진다. 여기서는 DOM 이 필요 없다(렌더가 아니라 «닫히는가»를 본다).
 */

const NOT_FOUND = new Error('NEXT_NOT_FOUND')

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw NOT_FOUND
  }),
}))

jest.mock('@/lib/domain/dev-preview/scenes', () => ({
  ...jest.requireActual('@/lib/domain/dev-preview/scenes'),
  isPreviewEnabled: jest.fn(() => true),
}))

// 장면 렌더 표는 여기 관심사가 아니다 — 무거운 자식(framer-motion·서버 액션 체인)을 끌어오지 않게 세운다.
jest.mock('@/app/dev-preview/scene-views', () => ({
  PreviewSceneView: () => null,
}))

import { isPreviewEnabled } from '@/lib/domain/dev-preview/scenes'
import DevPreviewIndexPage from '../page'
import DevPreviewScenePage from '../[scene]/page'
import { GET as manifestGET } from '../manifest/route'

const guard = isPreviewEnabled as jest.MockedFunction<typeof isPreviewEnabled>

beforeEach(() => guard.mockReturnValue(true))

describe('가드가 «아니오» 라고 하면 미리보기는 존재하지 않는다', () => {
  beforeEach(() => guard.mockReturnValue(false))

  it('목록 페이지가 notFound() 한다', () => {
    expect(() => DevPreviewIndexPage()).toThrow(NOT_FOUND)
  })

  it('장면 페이지가 notFound() 한다 — 등록된 장면이라도', async () => {
    await expect(DevPreviewScenePage({ params: Promise.resolve({ scene: 'journey-empty' }) })).rejects.toThrow(
      NOT_FOUND
    )
  })

  it('장면표 API 가 404 를 준다', async () => {
    const res = await manifestGET()
    expect(res.status).toBe(404)
  })
})

describe('세 입구가 모두 NODE_ENV 로 가드를 묻는다', () => {
  it.each([
    ['목록', () => DevPreviewIndexPage()],
    ['장면', () => DevPreviewScenePage({ params: Promise.resolve({ scene: 'journey-empty' }) })],
    ['장면표 API', () => manifestGET()],
  ])('%s', async (_label, run) => {
    guard.mockClear()
    await run()
    expect(guard).toHaveBeenCalledWith(process.env.NODE_ENV)
  })
})

describe('가드가 «예» 라고 하면 선다', () => {
  it('목록 페이지가 notFound 하지 않는다', () => {
    expect(() => DevPreviewIndexPage()).not.toThrow()
  })

  it('등록된 장면은 선다', async () => {
    await expect(DevPreviewScenePage({ params: Promise.resolve({ scene: 'journey-empty' }) })).resolves.toBeTruthy()
  })

  it('등록되지 않은 장면은 notFound() 한다 — 가드가 열려 있어도', async () => {
    await expect(DevPreviewScenePage({ params: Promise.resolve({ scene: 'no-such-scene' }) })).rejects.toThrow(
      NOT_FOUND
    )
  })

  it('장면표 API 가 등록된 장면과 뷰포트를 그대로 준다 — 촬영 스크립트의 단일 출처', async () => {
    const res = await manifestGET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.scenes.map((s: { id: string }) => s.id)).toContain('journey-empty')
    expect(body.viewports.mobile).toEqual({ width: 375, height: 812 })
  })
})
