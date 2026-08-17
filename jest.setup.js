import '@testing-library/jest-dom'

// Supabase 모킹
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    })),
  })),
}))

// Supabase Server 모킹
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    })),
  })),
}))

// Next.js 모듈 모킹
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  })),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(() => ({
    get: jest.fn(),
  })),
}))

/**
 * 🔴 DOM 중첩 오류를 **테스트 실패로** 만든다 (2026-08-17 신설).
 *
 * `<p>` 안의 `<p>`·`<ul>`, `<li>` 안의 `<li>` 같은 잘못된 중첩은 브라우저 파서가 여는 태그를
 * **조기 종료**시켜 서버 HTML 과 클라이언트 트리를 어긋나게 한다 — 하이드레이션 오류다.
 * 화면은 «대충 그려지는» 것처럼 보여서 아무도 신고하지 않는다. 실제로 두 건이 라이브에 있었다:
 *   · CheonSection DetailCard — `<p>` 가 목록을 감쌈 (전날 #31 수복 때 들어간 결함)
 *   · RemedyPanel — `<li className="contents">` 안에 RemedyRow 의 `<li>` (6화면 공용)
 *
 * console.error 전체를 막지는 않는다. React 가 이 문구로만 알려주는 **중첩 위반**만 잡는다.
 */
const NESTING_PATTERNS = [/cannot be a descendant of/, /cannot contain a nested/]
const originalConsoleError = console.error

beforeEach(() => {
  console.error = (...args) => {
    const text = args.map((a) => (typeof a === 'string' ? a : '')).join(' ')
    if (NESTING_PATTERNS.some((re) => re.test(text))) {
      throw new Error(`잘못된 DOM 중첩 — 하이드레이션이 깨진다:\n${text}`)
    }
    originalConsoleError(...args)
  }
})

afterEach(() => {
  console.error = originalConsoleError
})
