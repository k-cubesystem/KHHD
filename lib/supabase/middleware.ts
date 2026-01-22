import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value),
                    );
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options),
                    );
                },
            },
        },
    );

    // 1. 사용자 정보 가져오기
    const { data: { user } } = await supabase.auth.getUser();

    // 2. 보호된 경로(/protected) 접근 제어
    if (request.nextUrl.pathname.startsWith("/protected") && !user) {
        return NextResponse.redirect(new URL("/auth/login", request.url));
    }

    // 3. 관리자 경로(/admin) 접근 제어
    if (request.nextUrl.pathname.startsWith("/admin")) {
        // 3.1 비로그인 시 로그인 페이지로
        if (!user) {
            return NextResponse.redirect(new URL("/auth/login", request.url));
        }

        // 3.2 Role 확인 (DB 조회 필요)
        // 주의: 미들웨어에서 DB 조회는 성능에 영향을 줄 수 있으므로 신중해야 함
        // 하지만 Admin 페이지는 빈도가 낮으므로 허용
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        // 관리자가 아니면 메인으로 튕겨냄
        if (!profile || profile.role !== 'admin') {
            return NextResponse.redirect(new URL("/protected", request.url));
        }
    }

    // 4. 이미 로그인했는데 로그인/회원가입 페이지 접근 시
    if ((request.nextUrl.pathname === "/auth/login" || request.nextUrl.pathname === "/auth/signup") && user) {
        return NextResponse.redirect(new URL("/protected", request.url));
    }

    return response;
}
