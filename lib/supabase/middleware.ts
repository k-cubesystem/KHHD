import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function updateSession(request: NextRequest) {
  // auth/callback은 자체적으로 세션을 처리하므로 middleware에서 제외
  // callback 실행 중 getUser() 호출 시 세션 미설정 상태에서 오류 발생 가능
  if (request.nextUrl.pathname.startsWith('/auth/callback')) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  // 1. 사용자 정보 가져오기
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 2. 보호된 경로(/protected) 접근 제어
  // /protected 경로는 반드시 로그인이 필요합니다.
  if (request.nextUrl.pathname.startsWith('/protected') && !user) {
    // 예외: /protected/public/* 경로는 로그인 없이 접근 가능하도록 설정할 수 있음
    // if (!request.nextUrl.pathname.startsWith("/protected/public")) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
    // }
  }

  // 3. 관리자 경로(/admin) 접근 제어
  // Service role key로 profiles를 조회하여 RLS 재귀 문제 없이 role 확인
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // 3.1 비로그인 시 로그인 페이지로
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    // 3.2 Service role 클라이언트로 RLS 우회하여 admin role 확인
    const adminClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll() {},
        },
      }
    )

    const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.redirect(new URL('/protected', request.url))
    }
  }

  // 4. 이미 로그인했는데 로그인/회원가입 페이지 접근 시
  if ((request.nextUrl.pathname === '/auth/login' || request.nextUrl.pathname === '/auth/signup') && user) {
    return NextResponse.redirect(new URL('/protected', request.url))
  }

  return response
}
